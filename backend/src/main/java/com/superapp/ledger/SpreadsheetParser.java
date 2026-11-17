package com.superapp.ledger;

import java.text.Normalizer;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads the debt spreadsheet exported as CSV. Column B is the date, C the per-person price, D the
 * participants (a repeated name is another share) and E free-form {@code name expr name expr}. Every other
 * column, including the bank and momo numbers, is never read.
 */
final class SpreadsheetParser {

	static final String GROUP_NOTE = "Badminton";

	static final String CHARGE_NOTE = "Other charge (from Excel)";

	static final String DEDUCTION_NOTE = "Deducted (from Excel)";

	private static final int DATE = 1;

	private static final int PRICE = 2;

	private static final int NAMES = 3;

	private static final int EXTRAS = 4;

	private static final long MIN_AMOUNT = 1000;

	private static final long MAX_AMOUNT = 1_000_000_000L;

	private static final Pattern DATE_CELL = Pattern.compile("(?:(?:t[2-7]|tcn|cn)\\s*)?(\\d{1,2})/(\\d{1,2})/(\\d{2}|\\d{4})", Pattern.CASE_INSENSITIVE);

	private static final Pattern AMOUNT_TOKEN = Pattern.compile("[+-]?\\d.*");

	private static final Pattern TERM = Pattern.compile("([+-]?)(\\d+(?:[.,]\\d+)*k?)", Pattern.CASE_INSENSITIVE);

	record Problem(int row, String reason) {

	}

	record ParsedExpense(int row, ExpenseType type, LocalDate date, String note, long shareAmount, Map<String, Integer> shares) {

	}

	record ParsedPayment(int row, String member, LocalDate date, long amount, String note) {

	}

	record Parsed(List<ParsedExpense> expenses, List<ParsedPayment> payments, List<Problem> problems) {

	}

	private final List<ParsedExpense> expenses = new ArrayList<>();

	private final List<ParsedPayment> payments = new ArrayList<>();

	private final List<Problem> problems = new ArrayList<>();

	private final Map<String, String> display = new LinkedHashMap<>();

	private LocalDate currentDate;

	private SpreadsheetParser() {
	}

	static Parsed parse(String csv) {
		SpreadsheetParser parser = new SpreadsheetParser();
		List<List<String>> records = Csv.parse(csv);
		for (int index = 1; index < records.size(); index++) {
			parser.row(index + 1, records.get(index));
		}
		return parser.result();
	}

	private Parsed result() {
		List<ParsedExpense> namedExpenses = expenses.stream()
			.map((expense) -> new ParsedExpense(expense.row(), expense.type(), expense.date(), expense.note(), expense.shareAmount(),
					rename(expense.shares())))
			.toList();
		List<ParsedPayment> namedPayments = payments.stream()
			.map((payment) -> new ParsedPayment(payment.row(), display.get(payment.member()), payment.date(), payment.amount(), payment.note()))
			.toList();
		return new Parsed(namedExpenses, namedPayments, List.copyOf(problems));
	}

	private Map<String, Integer> rename(Map<String, Integer> shares) {
		Map<String, Integer> named = new LinkedHashMap<>();
		shares.forEach((key, count) -> named.put(display.get(key), count));
		return named;
	}

	private void row(int number, List<String> cells) {
		String dateCell = clean(cell(cells, DATE));
		String priceCell = clean(cell(cells, PRICE));
		String namesCell = clean(cell(cells, NAMES));
		String extrasCell = clean(cell(cells, EXTRAS));
		if (dateCell.isEmpty() && priceCell.isEmpty() && namesCell.isEmpty() && extrasCell.isEmpty()) {
			return;
		}

		LocalDate date;
		if (dateCell.isEmpty()) {
			if (!priceCell.isEmpty() || !namesCell.isEmpty()) {
				problems.add(new Problem(number, "A price or names without a date"));
				return;
			}
			if (currentDate == null) {
				problems.add(new Problem(number, "Extra charges before any dated row"));
				return;
			}
			date = currentDate;
		}
		else {
			date = date(dateCell);
			if (date == null) {
				problems.add(new Problem(number, "Unrecognised date \"" + dateCell + "\""));
				return;
			}
			currentDate = date;
			groupExpense(number, date, priceCell, namesCell);
		}
		extras(number, date, extrasCell);
	}

	private void groupExpense(int number, LocalDate date, String priceCell, String namesCell) {
		if (priceCell.isEmpty()) {
			if (!namesCell.isEmpty()) {
				problems.add(new Problem(number, "Names without a price"));
			}
			return;
		}
		if (namesCell.isEmpty()) {
			return;
		}
		Long price = amount(number, priceCell);
		if (price == null) {
			return;
		}
		Map<String, Integer> shares = new LinkedHashMap<>();
		for (String name : namesCell.split(" ")) {
			shares.merge(key(name), 1, Integer::sum);
		}
		expenses.add(new ParsedExpense(number, ExpenseType.GROUP, date, GROUP_NOTE, price, shares));
	}

	private void extras(int number, LocalDate date, String extrasCell) {
		String member = null;
		boolean memberHasAmount = true;
		String sign = "";
		for (String token : extrasCell.isEmpty() ? new String[0] : extrasCell.split(" ")) {
			if (token.equals("+") || token.equals("-")) {
				sign = token;
			}
			else if (AMOUNT_TOKEN.matcher(token).matches()) {
				if (member == null) {
					problems.add(new Problem(number, "Amount \"" + token + "\" before any name"));
				}
				else {
					terms(number, date, member, sign + token);
					memberHasAmount = true;
				}
				sign = "";
			}
			else {
				if (!memberHasAmount) {
					problems.add(new Problem(number, "No amount after \"" + display.get(member) + "\""));
				}
				member = key(token);
				memberHasAmount = false;
				sign = "";
			}
		}
		if (!memberHasAmount) {
			problems.add(new Problem(number, "No amount after \"" + display.get(member) + "\""));
		}
	}

	private void terms(int number, LocalDate date, String member, String expression) {
		Matcher matcher = TERM.matcher(expression);
		int end = 0;
		List<Long> values = new ArrayList<>();
		while (matcher.find() && matcher.start() == end) {
			end = matcher.end();
			Long value = amount(number, matcher.group(2));
			if (value == null) {
				return;
			}
			values.add(matcher.group(1).equals("-") ? -value : value);
		}
		if (values.isEmpty() || end != expression.length()) {
			problems.add(new Problem(number, "Cannot read the amount \"" + expression + "\""));
			return;
		}
		for (long value : values) {
			if (value > 0) {
				expenses.add(new ParsedExpense(number, ExpenseType.PERSONAL, date, CHARGE_NOTE, value, new LinkedHashMap<>(Map.of(member, 1))));
			}
			else {
				payments.add(new ParsedPayment(number, member, date, -value, DEDUCTION_NOTE));
			}
		}
	}

	private Long amount(int number, String text) {
		OptionalLong parsed = Amounts.parse(text);
		if (parsed.isEmpty()) {
			problems.add(new Problem(number, "Cannot read the amount \"" + text + "\""));
			return null;
		}
		if (parsed.getAsLong() < MIN_AMOUNT || parsed.getAsLong() > MAX_AMOUNT) {
			problems.add(new Problem(number, "The amount \"" + text + "\" is outside 1.000đ to 1.000.000.000đ; a missing \"k\"?"));
			return null;
		}
		return parsed.getAsLong();
	}

	private String key(String name) {
		String normalized = Normalizer.normalize(name, Normalizer.Form.NFC);
		String key = normalized.toLowerCase(Locale.ROOT);
		display.putIfAbsent(key, normalized);
		return key;
	}

	private static LocalDate date(String text) {
		Matcher matcher = DATE_CELL.matcher(text);
		if (!matcher.matches()) {
			return null;
		}
		int year = Integer.parseInt(matcher.group(3));
		try {
			return LocalDate.of(year < 100 ? 2000 + year : year, Integer.parseInt(matcher.group(2)), Integer.parseInt(matcher.group(1)));
		}
		catch (DateTimeException ex) {
			return null;
		}
	}

	private static String cell(List<String> cells, int index) {
		return index < cells.size() ? cells.get(index) : "";
	}

	private static String clean(String text) {
		return text.replace(' ', ' ').strip().replaceAll("\\s+", " ");
	}

}
