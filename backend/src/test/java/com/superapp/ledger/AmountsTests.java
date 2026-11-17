package com.superapp.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.OptionalLong;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class AmountsTests {

	@ParameterizedTest
	@CsvSource(delimiter = '|', value = { "56k|56000", "56K|56000", "22.5k|22500", "22,5k|22500", "1.234k|1234", "56000|56000",
			"56.000|56000", "1.234.567|1234567", "1,234,567|1234567", "0|0", " 23k |23000" })
	void readsTheSpellingsPeopleType(String text, long expected) {
		assertThat(Amounts.parse(text)).isEqualTo(OptionalLong.of(expected));
	}

	@ParameterizedTest
	@ValueSource(strings = { "", "k", "abc", "5.5", "56.00", "12.3456k", "-5k", "1..000", "56 000", "5kk" })
	void rejectsAnythingElse(String text) {
		assertThat(Amounts.parse(text)).isEmpty();
	}

	@Test
	void roundsATotalUpToTheNextThousandPerShare() {
		assertThat(LedgerService.shareFromTotal(276_000, 12)).isEqualTo(23_000);
		assertThat(LedgerService.shareFromTotal(100_000, 3)).isEqualTo(34_000);
		assertThat(LedgerService.shareFromTotal(100_000, 4)).isEqualTo(25_000);
		assertThat(LedgerService.shareFromTotal(1, 7)).isEqualTo(1_000);
		assertThat(LedgerService.shareFromTotal(230_001, 10)).isEqualTo(24_000);
	}

}
