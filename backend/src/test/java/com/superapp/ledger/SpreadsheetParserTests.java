package com.superapp.ledger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.superapp.ledger.SpreadsheetParser.Parsed;
import com.superapp.ledger.SpreadsheetParser.ParsedExpense;
import com.superapp.ledger.SpreadsheetParser.ParsedPayment;
import com.superapp.ledger.SpreadsheetParser.Problem;

class SpreadsheetParserTests {

	private static final String HEADER = "No,Date,Price,Names,Extra,Bank,Momo\n";

	private static Parsed parse(String... rows) {
		return SpreadsheetParser.parse("﻿" + HEADER + String.join("\n", rows) + "\n");
	}

	@Test
	void datedRowWithPriceAndNamesBecomesAGroupExpenseWithRepeatedNamesAsShares() {
		Parsed parsed = parse("1,t3 9/1/24,23k,an an binh,,,");

		assertThat(parsed.problems()).isEmpty();
		assertThat(parsed.expenses()).singleElement().satisfies((expense) -> {
			assertThat(expense.type()).isEqualTo(ExpenseType.GROUP);
			assertThat(expense.date()).isEqualTo(LocalDate.of(2024, 1, 9));
			assertThat(expense.note()).isEqualTo("Badminton");
			assertThat(expense.shareAmount()).isEqualTo(23_000);
			assertThat(expense.shares()).containsExactly(Map.entry("an", 2), Map.entry("binh", 1));
			assertThat(expense.row()).isEqualTo(2);
		});
	}

	@Test
	void weekdayPrefixesAndTwoDigitYearsAreRead() {
		Parsed parsed = parse("1,tcn 8/9/24,20k,an,,,", "2,t7 31/12/25,20k,an,,,", "3,12/3/2026,20k,an,,,");

		assertThat(parsed.expenses()).extracting(ParsedExpense::date)
			.containsExactly(LocalDate.of(2024, 9, 8), LocalDate.of(2025, 12, 31), LocalDate.of(2026, 3, 12));
	}

	@Test
	void diacriticsSurviveAndDecomposedInputIsNormalised() {
		String decomposed = "ánh";
		Parsed parsed = parse("1,t3 9/1/24,23k,ánh " + decomposed + " " + decomposed + ",,,");

		assertThat(parsed.expenses()).singleElement()
			.satisfies((expense) -> assertThat(expense.shares()).containsExactly(Map.entry("ánh", 3)));
	}

	@Test
	void similarNamesAreDistinctPeople() {
		Parsed parsed = parse("1,t3 9/1/24,20k,phát hphat nnam knam,,,");

		assertThat(parsed.expenses().get(0).shares().keySet()).containsExactly("phát", "hphat", "nnam", "knam");
	}

	@Test
	void everyPositiveExtraTermIsAPersonalExpenseAndEveryNegativeOneAPayment() {
		Parsed parsed = parse("1,t3 9/1/24,,,chi 30k+45k+15k-45k-40k binh -270k,,");

		assertThat(parsed.problems()).isEmpty();
		assertThat(parsed.expenses()).extracting(ParsedExpense::shareAmount).containsExactly(30_000L, 45_000L, 15_000L);
		assertThat(parsed.expenses()).allSatisfy((expense) -> {
			assertThat(expense.type()).isEqualTo(ExpenseType.PERSONAL);
			assertThat(expense.note()).isEqualTo("Other charge (from Excel)");
			assertThat(expense.shares()).containsExactly(Map.entry("chi", 1));
		});
		assertThat(parsed.payments()).extracting(ParsedPayment::member, ParsedPayment::amount)
			.containsExactly(tuple("chi", 45_000L), tuple("chi", 40_000L),
					tuple("binh", 270_000L));
		assertThat(parsed.payments()).allSatisfy((payment) -> assertThat(payment.note()).isEqualTo("Deducted (from Excel)"));
	}

	@Test
	void strayAndTrailingSpacesInTheExtraColumnAreIgnored() {
		Parsed parsed = parse("1,t3 9/1/24,,,  chi   30k    binh  -20k   ,,");

		assertThat(parsed.problems()).isEmpty();
		assertThat(parsed.expenses()).extracting(ParsedExpense::shareAmount).containsExactly(30_000L);
		assertThat(parsed.payments()).extracting(ParsedPayment::amount).containsExactly(20_000L);
	}

	@Test
	void rowsWithOnlyAnExtraTakeTheDateOfTheNearestDatedRowAbove() {
		Parsed parsed = parse("1,t3 9/1/24,23k,an,,,", "2,t5 11/1/24,,,,,", "3,,,,chi 10k,,", "4,,,,,,", "5,,,,binh -5k,,");

		assertThat(parsed.problems()).isEmpty();
		assertThat(parsed.expenses()).filteredOn((expense) -> expense.type() == ExpenseType.PERSONAL)
			.singleElement()
			.satisfies((expense) -> assertThat(expense.date()).isEqualTo(LocalDate.of(2024, 1, 11)));
		assertThat(parsed.payments()).singleElement()
			.satisfies((payment) -> assertThat(payment.date()).isEqualTo(LocalDate.of(2024, 1, 11)));
	}

	@Test
	void datesNeedNotBeInOrder() {
		Parsed parsed = parse("1,t3 9/1/24,20k,an,,,", "2,t2 1/1/24,20k,an,,,", "3,,,,an 5k,,");

		assertThat(parsed.expenses()).extracting(ParsedExpense::date)
			.containsExactly(LocalDate.of(2024, 1, 9), LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 1));
	}

	@Test
	void datedRowWithoutPriceCreatesNoExpense() {
		Parsed parsed = parse("1,t3 9/1/24,,,,,", "2,t4 10/1/24,20k,an,,,");

		assertThat(parsed.expenses()).hasSize(1);
		assertThat(parsed.problems()).isEmpty();
	}

	@Test
	void datedRowWithAPriceButNoNamesMeansEveryonePaidAndCreatesNothing() {
		Parsed parsed = parse("1,t3 9/1/24,23k,,,,", "2,t4 10/1/24,23k,,,,");

		assertThat(parsed.expenses()).isEmpty();
		assertThat(parsed.problems()).isEmpty();
	}

	@Test
	void blankRowsAreSkippedButStillCountForRowNumbers() {
		Parsed parsed = parse(",,,,,,", "", "3,t3 9/1/24,20k,an,,,");

		assertThat(parsed.expenses()).singleElement().satisfies((expense) -> assertThat(expense.row()).isEqualTo(4));
	}

	@Test
	void unreadableRowsAreReportedWithTheirRowNumbers() {
		Parsed parsed = parse("1,t3 99/9/24,20k,an,,,", "2,t3 9/1/24,,an,,,", "3,t3 9/1/24,abc,an,,,",
				"4,,20k,an,,,", "5,t3 9/1/24,,,chi 3x,,", "6,t3 9/1/24,,,30k,,", "7,t3 9/1/24,,,chi,,", "8,t3 9/1/24,,,chi 500,,");

		assertThat(parsed.expenses()).isEmpty();
		assertThat(parsed.problems()).extracting(Problem::row).containsExactly(2, 3, 4, 5, 6, 7, 8, 9);
		assertThat(parsed.problems().get(0).reason()).contains("99/9/24");
	}

	@Test
	void extraTermsBeforeAnyDatedRowAreReported() {
		Parsed parsed = parse("1,,,,chi 10k,,", "2,t3 9/1/24,20k,an,,,");

		assertThat(parsed.problems()).extracting(Problem::row).containsExactly(2);
		assertThat(parsed.payments()).isEmpty();
		assertThat(parsed.expenses()).hasSize(1);
	}

	@Test
	void bankAndMomoColumnsAreNeverReadOrCarried() {
		Parsed parsed = parse("1,t3 9/1/24,20k,an,,0000111122,0900000000", "2,,,,chi 10k,0000333344,0900000001");

		String everything = parsed.toString();
		assertThat(everything).doesNotContain("0000111122", "0900000000", "0000333344", "0900000001");
	}

	@Test
	void semicolonDelimitedExportsAndQuotedCellsAreRead() {
		Parsed parsed = SpreadsheetParser.parse("No;Date;Price;Names;Extra\r\n1;t3 9/1/24;\"23k\";\"an binh\";\"chi 10k binh -5k\"\r\n");

		assertThat(parsed.problems()).isEmpty();
		assertThat(parsed.expenses()).hasSize(2);
		assertThat(parsed.payments()).hasSize(1);
	}

	@Test
	void firstSpellingOfANameWinsTheDisplayForm() {
		Parsed parsed = parse("1,t3 9/1/24,20k,An binh,,,", "2,t4 10/1/24,20k,an Binh,,,");

		List<String> names = parsed.expenses().stream().flatMap((expense) -> expense.shares().keySet().stream()).distinct().toList();
		assertThat(names).containsExactly("An", "binh");
	}

}
