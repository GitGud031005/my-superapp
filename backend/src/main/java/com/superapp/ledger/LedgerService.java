package com.superapp.ledger;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.superapp.identity.CurrentUser;
import com.superapp.ledger.LedgerApi.Expense;
import com.superapp.ledger.LedgerApi.ExpenseInput;
import com.superapp.ledger.LedgerApi.Line;
import com.superapp.ledger.LedgerApi.Member;
import com.superapp.ledger.LedgerApi.MemberHistory;
import com.superapp.ledger.LedgerApi.MemberInput;
import com.superapp.ledger.LedgerApi.Mine;
import com.superapp.ledger.LedgerApi.MyLedger;
import com.superapp.ledger.LedgerApi.ParticipantInput;
import com.superapp.ledger.LedgerApi.Payment;
import com.superapp.ledger.LedgerApi.PaymentInput;
import com.superapp.ledger.LedgerRepository.Entry;
import com.superapp.ledger.LedgerRepository.ExpenseData;

@Service
@Transactional
class LedgerService {

	private static final long ROUNDING = 1000;

	private static final String DEFAULT_PAYMENT_NOTE = "Paid";

	private final LedgerRepository repository;

	private final LedgerAccess access;

	LedgerService(LedgerRepository repository, LedgerAccess access) {
		this.repository = repository;
		this.access = access;
	}

	/** Per-share price for splitting a total: the even split rounded up to the next 1,000đ. */
	static long shareFromTotal(long total, int totalShares) {
		long evenSplit = Math.ceilDiv(total, totalShares);
		return Math.ceilDiv(evenSplit, ROUNDING) * ROUNDING;
	}

	@Transactional(readOnly = true)
	MyLedger myLedger(CurrentUser user) {
		Mine mine = user.emailVerified() ? repository.memberByEmail(user.email())
			.map((member) -> new Mine(member.name(), member.balance(), lines(member.id()).stream().map(Line::withoutId).toList()))
			.orElse(null) : null;
		return new MyLedger(access.isAdmin(user), mine);
	}

	@Transactional(readOnly = true)
	List<Member> members() {
		return repository.members();
	}

	Member createMember(MemberInput input) {
		try {
			return repository.insertMember(name(input.name()), email(input.email()));
		}
		catch (DuplicateKeyException ex) {
			throw duplicateMember();
		}
	}

	Member updateMember(UUID id, MemberInput input) {
		try {
			if (!repository.updateMember(id, name(input.name()), email(input.email()))) {
				throw notFound("member");
			}
		}
		catch (DuplicateKeyException ex) {
			throw duplicateMember();
		}
		return repository.member(id).orElseThrow();
	}

	void deleteMember(UUID id) {
		if (repository.memberHasEntries(id)) {
			throw new LedgerException(HttpStatus.CONFLICT, "This member has expenses or payments. Delete those first.");
		}
		if (!repository.deleteMember(id)) {
			throw notFound("member");
		}
	}

	@Transactional(readOnly = true)
	MemberHistory history(UUID memberId) {
		Member member = repository.member(memberId).orElseThrow(() -> notFound("member"));
		return new MemberHistory(member, lines(memberId));
	}

	@Transactional(readOnly = true)
	List<Expense> expenses(int limit, int offset) {
		return repository.expenses(Math.clamp(limit, 1, 200), Math.max(offset, 0));
	}

	Expense createExpense(ExpenseInput input) {
		return repository.expense(repository.insertExpense(expenseData(input))).orElseThrow();
	}

	Expense updateExpense(UUID id, ExpenseInput input) {
		if (!repository.updateExpense(id, expenseData(input))) {
			throw notFound("expense");
		}
		return repository.expense(id).orElseThrow();
	}

	void deleteExpense(UUID id) {
		if (!repository.deleteExpense(id)) {
			throw notFound("expense");
		}
	}

	Payment createPayment(PaymentInput input) {
		requireMember(input.memberId());
		return repository.insertPayment(input.memberId(), input.date(), input.amount(), paymentNote(input.note()));
	}

	Payment updatePayment(UUID id, PaymentInput input) {
		requireMember(input.memberId());
		return repository.updatePayment(id, input.memberId(), input.date(), input.amount(), paymentNote(input.note()))
			.orElseThrow(() -> notFound("payment"));
	}

	void deletePayment(UUID id) {
		if (!repository.deletePayment(id)) {
			throw notFound("payment");
		}
	}

	private List<Line> lines(UUID memberId) {
		List<Entry> entries = new ArrayList<>(repository.entries(memberId));
		entries.sort(Comparator.comparing(Entry::date).thenComparing(Entry::createdAt).thenComparing(Entry::id));
		List<Line> lines = new ArrayList<>(entries.size());
		long balance = 0;
		for (Entry entry : entries) {
			balance += entry.kind() == Line.Kind.PAYMENT ? -entry.amount() : entry.amount();
			lines.add(new Line(entry.id(), entry.kind(), entry.type(), entry.date(), entry.note(), entry.amount(), entry.shareAmount(),
					entry.shares(), entry.totalShares(), balance));
		}
		Collections.reverse(lines);
		return lines;
	}

	private ExpenseData expenseData(ExpenseInput input) {
		Map<UUID, Integer> shares = new LinkedHashMap<>();
		for (ParticipantInput participant : input.participants()) {
			if (shares.put(participant.memberId(), participant.shares()) != null) {
				throw new LedgerException(HttpStatus.BAD_REQUEST, "A member is listed twice.");
			}
		}
		if (repository.existingMemberIds(shares.keySet()).size() != shares.size()) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "Unknown member.");
		}
		int ownerShares = input.ownerShares() == null ? 0 : input.ownerShares();
		String note = input.note().strip();

		if (input.type() == ExpenseType.PERSONAL) {
			if (shares.size() != 1 || shares.values().iterator().next() != 1 || ownerShares != 0 || input.total() != null
					|| input.shareAmount() == null) {
				throw new LedgerException(HttpStatus.BAD_REQUEST, "A personal expense is one member, one share and a price.");
			}
			return new ExpenseData(input.type(), input.date(), note, input.shareAmount(), 0, shares);
		}

		if ((input.shareAmount() == null) == (input.total() == null)) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "Give either a price per share or a total, not both.");
		}
		long shareAmount = input.shareAmount() != null ? input.shareAmount()
				: shareFromTotal(input.total(), shares.values().stream().mapToInt(Integer::intValue).sum() + ownerShares);
		if (shareAmount > LedgerApi.MAX_AMOUNT) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "The price per share is too large.");
		}
		return new ExpenseData(input.type(), input.date(), note, shareAmount, ownerShares, shares);
	}

	private void requireMember(UUID id) {
		if (repository.member(id).isEmpty()) {
			throw new LedgerException(HttpStatus.BAD_REQUEST, "Unknown member.");
		}
	}

	private static String paymentNote(String note) {
		return note == null || note.isBlank() ? DEFAULT_PAYMENT_NOTE : note.strip();
	}

	private static String name(String text) {
		return Normalizer.normalize(text.strip(), Normalizer.Form.NFC);
	}

	private static String email(String text) {
		return text == null || text.isBlank() ? null : text.strip().toLowerCase(Locale.ROOT);
	}

	private static LedgerException notFound(String what) {
		return new LedgerException(HttpStatus.NOT_FOUND, "No such " + what + ".");
	}

	private static LedgerException duplicateMember() {
		return new LedgerException(HttpStatus.CONFLICT, "Another member already has this name or email.");
	}

}
