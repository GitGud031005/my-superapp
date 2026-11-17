package com.superapp.ledger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class ImportApiTests extends LedgerTestSupport {

	private static final String CSV = """
			No,Date,Price,Names,Extra,Bank,Momo
			1,t3 9/1/24,23k,an an binh,,0000111122,
			2,tcn 14/1/24,25k,binh chi,chi 30k+45k-20k binh -270k,,
			3,,,,  an  15k   ,,
			4,,,,,,
			5,t4 99/9/24,20k,an,,,
			6,t5 11/1/24,,an,,,
			7,t6 12/1/24,,,,,
			8,,,,chi 10k,,
			""";

	private static final String MAPPING = """
			[{"source":"an","action":"NEW","name":"Ann"},
			 {"source":"binh","action":"NEW","name":"Bea"},
			 {"source":"chi","action":"NEW","name":"Cy"}]
			""";

	private ResultActions upload(RequestPostProcessor who, String step, byte[] bytes, String mapping) throws Exception {
		var request = multipart("/api/ledger/admin/import/" + step).file(new MockMultipartFile("file", "ledger.csv", "text/csv", bytes));
		if (mapping != null) {
			request.file(new MockMultipartFile("mapping", "", "application/json", mapping.getBytes(StandardCharsets.UTF_8)));
		}
		return mvc.perform(withCsrf(request, who));
	}

	private ResultActions upload(RequestPostProcessor who, String step, byte[] bytes) throws Exception {
		return upload(who, step, bytes, null);
	}

	private static byte[] csv(String text) {
		return ("﻿" + text).getBytes(StandardCharsets.UTF_8);
	}

	private long count(String table) {
		return jdbc.sql("SELECT count(*) FROM ledger." + table).query(Long.class).single();
	}

	@Test
	void aDryRunWithoutAMappingListsTheDetectedNamesAndWritesNothing() throws Exception {
		upload(admin(), "dry-run", csv(CSV)).andExpect(status().isOk())
			.andExpect(jsonPath("$.ledgerEmpty").value(true))
			.andExpect(jsonPath("$.groupExpenses").value(2))
			.andExpect(jsonPath("$.personalExpenses").value(4))
			.andExpect(jsonPath("$.payments").value(2))
			.andExpect(jsonPath("$.names", hasSize(3)))
			.andExpect(jsonPath("$.names[0].name").value("an"))
			.andExpect(jsonPath("$.names[0].expenses").value(2))
			.andExpect(jsonPath("$.names[1].name").value("binh"))
			.andExpect(jsonPath("$.names[1].expenses").value(2))
			.andExpect(jsonPath("$.names[1].payments").value(1))
			.andExpect(jsonPath("$.names[2].name").value("chi"))
			.andExpect(jsonPath("$.names[2].expenses").value(4))
			.andExpect(jsonPath("$.members", hasSize(0)))
			.andExpect(jsonPath("$.problems", hasSize(2)))
			.andExpect(jsonPath("$.problems[0].row").value(6))
			.andExpect(jsonPath("$.problems[1].row").value(7));

		assertThat(count("member")).isZero();
		assertThat(count("expense")).isZero();
	}

	@Test
	void aDryRunWithAMappingShowsTheResultingMembersAndBalances() throws Exception {
		upload(admin(), "dry-run", csv(CSV), MAPPING).andExpect(status().isOk())
			.andExpect(jsonPath("$.members", hasSize(3)))
			.andExpect(jsonPath("$.members[0].name").value("Ann"))
			.andExpect(jsonPath("$.members[0].balance").value(61000))
			.andExpect(jsonPath("$.members[0].exists").value(false))
			.andExpect(jsonPath("$.members[1].name").value("Bea"))
			.andExpect(jsonPath("$.members[1].balance").value(-222000))
			.andExpect(jsonPath("$.members[2].name").value("Cy"))
			.andExpect(jsonPath("$.members[2].balance").value(90000))
			.andExpect(jsonPath("$.ignored", hasSize(0)));

		assertThat(count("member")).isZero();
	}

	@Test
	void mergingANameAddsItsSharesAndPaymentsToTheTarget() throws Exception {
		String file = "No,Date,Price,Names,Extra\n1,t3 9/1/24,20k,an anx,,\n2,t4 10/1/24,,,anx -5k,,\n";
		String mapping = """
				[{"source":"an","action":"NEW","name":"Ann"},{"source":"anx","action":"MERGE","into":"an"}]
				""";

		upload(admin(), "dry-run", csv(file), mapping).andExpect(status().isOk())
			.andExpect(jsonPath("$.members", hasSize(1)))
			.andExpect(jsonPath("$.members[0].name").value("Ann"))
			.andExpect(jsonPath("$.members[0].balance").value(35000))
			.andExpect(jsonPath("$.groupExpenses").value(1));

		upload(admin(), "confirm", csv(file), mapping).andExpect(status().isOk());
		assertThat(jdbc.sql("SELECT shares FROM ledger.expense_share").query(Integer.class).single()).isEqualTo(2);
		assertThat(count("member")).isEqualTo(1);
		assertThat(jdbc.sql("SELECT amount FROM ledger.payment").query(Long.class).single()).isEqualTo(5000);
	}

	@Test
	void ignoringANameDropsItsSharesAndAmountsAndListsThem() throws Exception {
		String file = "No,Date,Price,Names,Extra\n1,t3 9/1/24,20k,an joke,joke 10k,\n2,t4 10/1/24,,,joke -5k,,\n";
		String mapping = """
				[{"source":"an","action":"NEW","name":"Ann"},{"source":"joke","action":"IGNORE"}]
				""";

		upload(admin(), "dry-run", csv(file), mapping).andExpect(status().isOk())
			.andExpect(jsonPath("$.members", hasSize(1)))
			.andExpect(jsonPath("$.members[0].balance").value(20000))
			.andExpect(jsonPath("$.groupExpenses").value(1))
			.andExpect(jsonPath("$.personalExpenses").value(0))
			.andExpect(jsonPath("$.payments").value(0))
			.andExpect(jsonPath("$.ignored", hasSize(1)))
			.andExpect(jsonPath("$.ignored[0].name").value("joke"))
			.andExpect(jsonPath("$.ignored[0].expenses").value(2))
			.andExpect(jsonPath("$.ignored[0].payments").value(1));

		upload(admin(), "confirm", csv(file), mapping).andExpect(status().isOk());
		assertThat(count("member")).isEqualTo(1);
		assertThat(count("expense")).isEqualTo(1);
		assertThat(count("payment")).isZero();
	}

	@Test
	void namesDifferingOnlyInUnicodeFormOrCaseAreTheSameSpreadsheetName() throws Exception {
		String file = "No,Date,Price,Names\n1,t3 9/1/24,20k,án Án án\n";
		String mapping = "[{\"source\":\"ÁN\",\"action\":\"NEW\",\"name\":\"Ann\"}]";

		upload(admin(), "dry-run", csv(file), mapping).andExpect(status().isOk())
			.andExpect(jsonPath("$.names", hasSize(1)))
			.andExpect(jsonPath("$.members[0].balance").value(60000));
	}

	@Test
	void confirmWritesEverythingUnderTheMappedNamesAndStoresNoSpreadsheetName() throws Exception {
		upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().isOk());

		assertThat(jdbc.sql("SELECT name FROM ledger.member ORDER BY name").query(String.class).list()).containsExactly("Ann", "Bea", "Cy");
		assertThat(count("member")).isEqualTo(3);
		assertThat(jdbc.sql("SELECT count(*) FROM ledger.member WHERE email IS NOT NULL").query(Long.class).single()).isZero();
		assertThat(count("expense")).isEqualTo(6);
		assertThat(count("payment")).isEqualTo(2);
		assertThat(count("expense_share")).isEqualTo(8);
		assertThat(jdbc.sql("SELECT share_amount FROM ledger.expense WHERE type = 'GROUP' ORDER BY occurred_on").query(Long.class).list())
			.containsExactly(23000L, 25000L);
		send(admin(), "GET", "/api/ledger/admin/members", null).andExpect(jsonPath("$[0].name").value("Ann"))
			.andExpect(jsonPath("$[0].balance").value(61000))
			.andExpect(jsonPath("$[1].balance").value(-222000))
			.andExpect(jsonPath("$[2].balance").value(90000));
	}

	@Test
	void confirmNeedsACompleteAndValidMappingAndWritesNothingOtherwise() throws Exception {
		upload(admin(), "confirm", csv(CSV)).andExpect(status().isBadRequest());
		upload(admin(), "confirm", csv(CSV), "[{\"source\":\"an\",\"action\":\"NEW\",\"name\":\"Ann\"}]").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error").value(containsString("binh")));
		upload(admin(), "confirm", csv(CSV), MAPPING.replace("\"Bea\"", "\" \"")).andExpect(status().isBadRequest());
		upload(admin(), "confirm", csv(CSV), MAPPING.replace("}]", "},{\"source\":\"ghost\",\"action\":\"IGNORE\"}]")).andExpect(status().isBadRequest());
		upload(admin(), "confirm", csv(CSV), MAPPING.replace("}]", "},{\"source\":\"an\",\"action\":\"IGNORE\"}]")).andExpect(status().isBadRequest());
		upload(admin(), "confirm", csv(CSV), """
				[{"source":"an","action":"NEW","name":"Ann"},{"source":"binh","action":"MERGE","into":"chi"},
				 {"source":"chi","action":"MERGE","into":"an"}]
				""").andExpect(status().isBadRequest());
		upload(admin(), "confirm", csv(CSV), """
				[{"source":"an","action":"NEW","name":"Ann"},{"source":"binh","action":"MERGE","into":"binh"},
				 {"source":"chi","action":"IGNORE"}]
				""").andExpect(status().isBadRequest());

		assertThat(count("member")).isZero();
		assertThat(count("expense")).isZero();
	}

	@Test
	void importRefusesALedgerThatAlreadyHasData() throws Exception {
		upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().isOk());

		upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().isConflict());
		upload(admin(), "dry-run", csv(CSV)).andExpect(status().isOk()).andExpect(jsonPath("$.ledgerEmpty").value(false));

		assertThat(count("expense")).isEqualTo(6);
		assertThat(count("payment")).isEqualTo(2);
		assertThat(count("member")).isEqualTo(3);
	}

	@Test
	void importRefusesWhenOnlyAPaymentExists() throws Exception {
		String anna = createMember("Anna", null);
		send(admin(), "POST", "/api/ledger/admin/payments", "{\"memberId\":\"%s\",\"date\":\"2024-01-10\",\"amount\":1000}".formatted(anna));

		upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().isConflict());
	}

	@Test
	void aMappedNameThatMatchesAnExistingMemberReusesItAndKeepsItsEmail() throws Exception {
		createMember("bea", "bea@example.com");

		upload(admin(), "dry-run", csv(CSV), MAPPING).andExpect(jsonPath("$.members[1].exists").value(true))
			.andExpect(jsonPath("$.members[0].exists").value(false));
		upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().isOk());

		assertThat(count("member")).isEqualTo(3);
		assertThat(jdbc.sql("SELECT email FROM ledger.member WHERE lower(name) = 'bea'").query(String.class).single()).isEqualTo("bea@example.com");
		send(friend("bea@example.com"), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.balance").value(-222000));
	}

	@Test
	void aFileThatIsNotUtf8IsRefusedWithAHint() throws Exception {
		byte[] latin1 = "No,Date,Price,Names\n1,t3 9/1/24,23k,án\n".getBytes(StandardCharsets.ISO_8859_1);

		upload(admin(), "dry-run", latin1).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value(containsString("UTF-8")));
	}

	@Test
	void confirmRefusesAFileWithNothingToImport() throws Exception {
		upload(admin(), "confirm", csv("No,Date,Price,Names,Extra\n,,,,\n"), "[]").andExpect(status().isBadRequest());

		assertThat(count("member")).isZero();
	}

	@Test
	void nonAdminsCannotImport() throws Exception {
		upload(friend("anna@example.com"), "dry-run", csv(CSV)).andExpect(status().isForbidden());
		upload(friend("anna@example.com"), "confirm", csv(CSV), MAPPING).andExpect(status().isForbidden());

		assertThat(count("expense")).isZero();
	}

	@Test
	void aFailureHalfwayThroughRollsEverythingBack() throws Exception {
		jdbc.sql("""
				CREATE OR REPLACE FUNCTION ledger.fail_on_payment() RETURNS trigger AS $$
				BEGIN RAISE EXCEPTION 'boom'; END $$ LANGUAGE plpgsql
				""").update();
		jdbc.sql("CREATE TRIGGER fail_payment BEFORE INSERT ON ledger.payment FOR EACH ROW EXECUTE FUNCTION ledger.fail_on_payment()").update();
		try {
			upload(admin(), "confirm", csv(CSV), MAPPING).andExpect(status().is5xxServerError());
		}
		catch (Exception expected) {
			// MockMvc rethrows the unhandled exception
		}
		finally {
			jdbc.sql("DROP TRIGGER fail_payment ON ledger.payment").update();
			jdbc.sql("DROP FUNCTION ledger.fail_on_payment()").update();
		}

		assertThat(count("expense")).isZero();
		assertThat(count("member")).isZero();
	}

}
