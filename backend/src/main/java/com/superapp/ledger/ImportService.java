package com.superapp.ledger;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.ledger.LedgerApi.DetectedName;
import com.superapp.ledger.LedgerApi.ImportMember;
import com.superapp.ledger.LedgerApi.ImportPreview;
import com.superapp.ledger.LedgerApi.MappingAction;
import com.superapp.ledger.LedgerApi.MappingEntry;
import com.superapp.ledger.LedgerRepository.ExpenseData;
import com.superapp.ledger.SpreadsheetParser.Parsed;
import com.superapp.ledger.SpreadsheetParser.ParsedExpense;
import com.superapp.ledger.SpreadsheetParser.ParsedPayment;

/**
 * Spreadsheet names are only import keys: the admin maps each one to a member name (new, merged into another
 * spreadsheet name, or ignored) on every dry run and again on confirm. The mapping is never stored.
 */
@Service
@Transactional
class ImportService {

	private static final int MAX_NAME = 60;

	private record ResolvedExpense(ExpenseType type, LocalDate date, String note, long shareAmount, Map<String, Integer> shares) {

	}

	private record ResolvedPayment(String member, LocalDate date, long amount, String note) {

	}

	private record Resolved(List<ResolvedExpense> expenses, List<ResolvedPayment> payments, Map<String, String> memberNames,
			List<DetectedName> ignored) {

	}

	private final LedgerRepository repository;

	ImportService(LedgerRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	ImportPreview dryRun(byte[] file, List<MappingEntry> mapping) {
		Parsed parsed = SpreadsheetParser.parse(decode(file));
		return preview(parsed, mapping == null ? null : resolve(parsed, mapping), !repository.hasEntries());
	}

	ImportPreview confirm(byte[] file, List<MappingEntry> mapping) {
		repository.lockEntries();
		if (repository.hasEntries()) {
			throw new LedgerException(HttpStatus.CONFLICT, "The ledger already has expenses or payments, so nothing was imported.");
		}
		if (mapping == null) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "Map every name before importing.");
		}
		Parsed parsed = SpreadsheetParser.parse(decode(file));
		Resolved resolved = resolve(parsed, mapping);
		if (resolved.expenses().isEmpty() && resolved.payments().isEmpty()) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "Nothing is left to import after ignoring names.");
		}

		Map<String, UUID> ids = new HashMap<>();
		repository.members().forEach((member) -> ids.put(key(member.name()), member.id()));
		resolved.memberNames().forEach((key, name) -> ids.computeIfAbsent(key, (unused) -> repository.insertMember(name, null).id()));
		for (ResolvedExpense expense : resolved.expenses()) {
			Map<UUID, Integer> shares = new LinkedHashMap<>();
			expense.shares().forEach((member, count) -> shares.put(ids.get(member), count));
			repository.insertExpense(new ExpenseData(expense.type(), expense.date(), expense.note(), expense.shareAmount(), 0, shares));
		}
		for (ResolvedPayment payment : resolved.payments()) {
			repository.insertPayment(ids.get(payment.member()), payment.date(), payment.amount(), payment.note());
		}
		return preview(parsed, resolved, true);
	}

	private Resolved resolve(Parsed parsed, List<MappingEntry> mapping) {
		List<DetectedName> detected = detected(parsed);
		Map<String, MappingEntry> bySource = new LinkedHashMap<>();
		for (MappingEntry entry : mapping) {
			String source = key(entry.source());
			if (detected.stream().noneMatch((name) -> key(name.name()).equals(source))) {
				throw new LedgerException(HttpStatus.BAD_REQUEST, "The mapping names something that is not in the file: " + entry.source());
			}
			if (bySource.put(source, entry) != null) {
				throw new LedgerException(HttpStatus.BAD_REQUEST, "A name is mapped twice: " + entry.source());
			}
		}
		for (DetectedName name : detected) {
			if (!bySource.containsKey(key(name.name()))) {
				throw new LedgerException(HttpStatus.BAD_REQUEST, "Every name needs a choice, but none was given for " + name.name());
			}
		}

		Map<String, String> memberNames = new LinkedHashMap<>();
		Map<String, String> target = new HashMap<>();
		bySource.forEach((source, entry) -> {
			if (entry.action() == MappingAction.NEW) {
				String name = memberName(entry.name());
				memberNames.putIfAbsent(key(name), name);
				target.put(source, key(name));
			}
		});
		bySource.forEach((source, entry) -> {
			if (entry.action() == MappingAction.MERGE) {
				String into = entry.into() == null ? "" : key(entry.into());
				MappingEntry destination = bySource.get(into);
				if (destination == null || destination.action() != MappingAction.NEW || into.equals(source)) {
					throw new LedgerException(HttpStatus.BAD_REQUEST, "A name can only be merged into another name that gets its own member.");
				}
				target.put(source, target.get(into));
			}
		});

		Map<String, int[]> dropped = new LinkedHashMap<>();
		List<ResolvedExpense> expenses = new ArrayList<>();
		for (ParsedExpense expense : parsed.expenses()) {
			Map<String, Integer> shares = new LinkedHashMap<>();
			for (Map.Entry<String, Integer> share : expense.shares().entrySet()) {
				String member = target.get(key(share.getKey()));
				if (member == null) {
					dropped.computeIfAbsent(key(share.getKey()), (unused) -> new int[2])[0]++;
				}
				else {
					shares.merge(member, share.getValue(), Integer::sum);
				}
			}
			if (!shares.isEmpty()) {
				expenses.add(new ResolvedExpense(expense.type(), expense.date(), expense.note(), expense.shareAmount(), shares));
			}
		}
		List<ResolvedPayment> payments = new ArrayList<>();
		for (ParsedPayment payment : parsed.payments()) {
			String member = target.get(key(payment.member()));
			if (member == null) {
				dropped.computeIfAbsent(key(payment.member()), (unused) -> new int[2])[1]++;
			}
			else {
				payments.add(new ResolvedPayment(member, payment.date(), payment.amount(), payment.note()));
			}
		}
		List<DetectedName> ignored = detected.stream()
			.filter((name) -> dropped.containsKey(key(name.name())))
			.map((name) -> new DetectedName(name.name(), dropped.get(key(name.name()))[0], dropped.get(key(name.name()))[1]))
			.toList();
		return new Resolved(expenses, payments, memberNames, ignored);
	}

	private ImportPreview preview(Parsed parsed, Resolved resolved, boolean ledgerEmpty) {
		List<DetectedName> names = detected(parsed);
		if (resolved == null) {
			long group = parsed.expenses().stream().filter((expense) -> expense.type() == ExpenseType.GROUP).count();
			return new ImportPreview(ledgerEmpty, (int) group, parsed.expenses().size() - (int) group, parsed.payments().size(), names,
					List.of(), List.of(), parsed.problems());
		}

		Map<String, UUID> existing = new HashMap<>();
		repository.members().forEach((member) -> existing.put(key(member.name()), member.id()));
		Map<String, long[]> totals = new LinkedHashMap<>();
		for (ResolvedExpense expense : resolved.expenses()) {
			expense.shares().forEach((member, count) -> {
				long[] row = totals.computeIfAbsent(member, (unused) -> new long[3]);
				row[0]++;
				row[2] += expense.shareAmount() * count;
			});
		}
		for (ResolvedPayment payment : resolved.payments()) {
			long[] row = totals.computeIfAbsent(payment.member(), (unused) -> new long[3]);
			row[1]++;
			row[2] -= payment.amount();
		}
		List<ImportMember> members = resolved.memberNames()
			.entrySet()
			.stream()
			.map((entry) -> {
				long[] row = totals.getOrDefault(entry.getKey(), new long[3]);
				return new ImportMember(entry.getValue(), existing.containsKey(entry.getKey()), (int) row[0], (int) row[1], row[2]);
			})
			.sorted(Comparator.comparing((ImportMember member) -> key(member.name())))
			.toList();
		long group = resolved.expenses().stream().filter((expense) -> expense.type() == ExpenseType.GROUP).count();
		return new ImportPreview(ledgerEmpty, (int) group, resolved.expenses().size() - (int) group, resolved.payments().size(), names,
				members, resolved.ignored(), parsed.problems());
	}

	private static List<DetectedName> detected(Parsed parsed) {
		Map<String, String> display = new LinkedHashMap<>();
		Map<String, int[]> counts = new LinkedHashMap<>();
		for (ParsedExpense expense : parsed.expenses()) {
			for (String name : expense.shares().keySet()) {
				display.putIfAbsent(key(name), name);
				counts.computeIfAbsent(key(name), (unused) -> new int[2])[0]++;
			}
		}
		for (ParsedPayment payment : parsed.payments()) {
			display.putIfAbsent(key(payment.member()), payment.member());
			counts.computeIfAbsent(key(payment.member()), (unused) -> new int[2])[1]++;
		}
		return display.entrySet()
			.stream()
			.sorted(Map.Entry.comparingByKey())
			.map((entry) -> new DetectedName(entry.getValue(), counts.get(entry.getKey())[0], counts.get(entry.getKey())[1]))
			.toList();
	}

	private static String memberName(String name) {
		String cleaned = name == null ? "" : Normalizer.normalize(name.strip(), Normalizer.Form.NFC);
		if (cleaned.isEmpty() || cleaned.length() > MAX_NAME) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "A member name must be 1 to " + MAX_NAME + " characters.");
		}
		return cleaned;
	}

	private static String key(String name) {
		return Normalizer.normalize(name.strip(), Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
	}

	private static String decode(byte[] file) {
		try {
			return StandardCharsets.UTF_8.newDecoder()
				.onMalformedInput(CodingErrorAction.REPORT)
				.onUnmappableCharacter(CodingErrorAction.REPORT)
				.decode(ByteBuffer.wrap(file))
				.toString();
		}
		catch (CharacterCodingException ex) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "The file is not UTF-8. In Excel, save it as \"CSV UTF-8 (Comma delimited)\".");
		}
	}

}
