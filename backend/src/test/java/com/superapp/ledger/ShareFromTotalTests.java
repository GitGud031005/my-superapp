package com.superapp.ledger;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ShareFromTotalTests {

	@Test
	void roundsATotalUpToTheNextThousandPerShare() {
		assertThat(LedgerService.shareFromTotal(276_000, 12)).isEqualTo(23_000);
		assertThat(LedgerService.shareFromTotal(100_000, 3)).isEqualTo(34_000);
		assertThat(LedgerService.shareFromTotal(100_000, 4)).isEqualTo(25_000);
		assertThat(LedgerService.shareFromTotal(1, 7)).isEqualTo(1_000);
		assertThat(LedgerService.shareFromTotal(230_001, 10)).isEqualTo(24_000);
	}

}
