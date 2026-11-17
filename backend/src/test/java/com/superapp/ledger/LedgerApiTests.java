package com.superapp.ledger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class LedgerApiTests extends LedgerTestSupport {

	private static final String ANNA = "anna@example.com";

	private static final String BEN = "ben@example.com";

	@Test
	void anonymousRequestsAreRejected() throws Exception {
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/ledger/me")).andExpect(status().isUnauthorized());
		mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/ledger/admin/members"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void anUnlinkedUserGetsAnEmptyLedgerAndNoAdminRights() throws Exception {
		createMember("Anna", ANNA);

		send(friend("stranger@example.com"), "GET", "/api/ledger/me", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.admin").value(false))
			.andExpect(jsonPath("$.member").doesNotExist());
	}

	@Test
	void anUnverifiedEmailNeverLinksToAMember() throws Exception {
		createMember("Anna", ANNA);

		send(signedIn(ANNA, false), "GET", "/api/ledger/me", null).andExpect(status().isOk()).andExpect(jsonPath("$.member").doesNotExist());
	}

	@Test
	void anAdminIsRecognisedByVerifiedEmailIgnoringCase() throws Exception {
		send(signedIn("SECOND.ADMIN@example.com", true), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.admin").value(true))
			.andExpect(jsonPath("$.member").doesNotExist());
		send(signedIn("SECOND.ADMIN@example.com", true), "GET", "/api/ledger/admin/members", null).andExpect(status().isOk());
	}

	@Test
	void anAdminEmailThatGoogleHasNotVerifiedGetsNoAdminRights() throws Exception {
		send(signedIn(ADMIN_EMAIL, false), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.admin").value(false));
		send(signedIn(ADMIN_EMAIL, false), "GET", "/api/ledger/admin/members", null).andExpect(status().isForbidden());
	}

	@ParameterizedTest
	@ValueSource(strings = { "GET /api/ledger/admin/members", "POST /api/ledger/admin/members", "GET /api/ledger/admin/expenses",
			"POST /api/ledger/admin/expenses", "POST /api/ledger/admin/payments", "POST /api/ledger/admin/import/dry-run",
			"POST /api/ledger/admin/import/confirm", "GET /api/ledger/admin/members/00000000-0000-0000-0000-000000000001/history",
			"PUT /api/ledger/admin/expenses/00000000-0000-0000-0000-000000000001",
			"DELETE /api/ledger/admin/payments/00000000-0000-0000-0000-000000000001", "GET /api/ledger/admin/anything-else" })
	void nonAdminsGet403OnEveryAdminEndpoint(String endpoint) throws Exception {
		createMember("Anna", ANNA);
		String[] parts = endpoint.split(" ");

		send(friend(ANNA), parts[0], parts[1], "{}").andExpect(status().isForbidden());
	}

	@Test
	void aFriendSeesOnlyTheirOwnLinesAndNeverTheOtherParticipants() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);
		createGroup("2024-01-09", "Badminton", participants(anna, "2", ben, "1"), 1, "\"shareAmount\":20000");
		send(admin(), "POST", "/api/ledger/admin/expenses", """
				{"type":"PERSONAL","date":"2024-01-10","note":"Shuttlecocks","participants":%s,"shareAmount":15000}
				""".formatted(participants(anna, "1")));
		send(admin(), "POST", "/api/ledger/admin/payments", """
				{"memberId":"%s","date":"2024-01-11","amount":25000}
				""".formatted(anna));
		send(admin(), "POST", "/api/ledger/admin/payments", """
				{"memberId":"%s","date":"2024-01-11","amount":99000,"note":"Ben secret"}
				""".formatted(ben));

		String mine = body(send(friend(ANNA), "GET", "/api/ledger/me?memberId=" + ben, null).andExpect(status().isOk())
			.andExpect(jsonPath("$.admin").value(false))
			.andExpect(jsonPath("$.member.name").value("Anna"))
			.andExpect(jsonPath("$.member.balance").value(30000))
			.andExpect(jsonPath("$.member.history", hasSize(3)))
			.andExpect(jsonPath("$.member.history[0].kind").value("PAYMENT"))
			.andExpect(jsonPath("$.member.history[0].amount").value(25000))
			.andExpect(jsonPath("$.member.history[0].balance").value(30000))
			.andExpect(jsonPath("$.member.history[1].type").value("PERSONAL"))
			.andExpect(jsonPath("$.member.history[1].note").value("Shuttlecocks"))
			.andExpect(jsonPath("$.member.history[1].balance").value(55000))
			.andExpect(jsonPath("$.member.history[2].type").value("GROUP"))
			.andExpect(jsonPath("$.member.history[2].amount").value(40000))
			.andExpect(jsonPath("$.member.history[2].shares").value(2))
			.andExpect(jsonPath("$.member.history[2].totalShares").value(4))
			.andExpect(jsonPath("$.member.history[2].balance").value(40000))
			.andExpect(jsonPath("$.member.history[0].id").doesNotExist())
			.andExpect(jsonPath("$.member.history[2].id").doesNotExist()));

		assertThat(mine).doesNotContain("Ben", BEN, "secret", "99000", ben);

		send(friend(BEN), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.name").value("Ben"))
			.andExpect(jsonPath("$.member.balance").value(20000 - 99000))
			.andExpect(jsonPath("$.member.history", hasSize(2)));
	}

	@Test
	void aFriendCannotReachAnyOtherMembersDataThroughAdminIds() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);
		String expense = createGroup("2024-01-09", "Badminton", participants(anna, "1", ben, "1"), 0, "\"shareAmount\":20000");

		send(friend(ANNA), "GET", "/api/ledger/admin/members/" + ben + "/history", null).andExpect(status().isForbidden());
		send(friend(ANNA), "GET", "/api/ledger/admin/members/" + anna + "/history", null).andExpect(status().isForbidden());
		send(friend(ANNA), "GET", "/api/ledger/admin/expenses", null).andExpect(status().isForbidden());
		send(friend(ANNA), "PUT", "/api/ledger/admin/expenses/" + expense, "{}").andExpect(status().isForbidden());
		send(friend(ANNA), "DELETE", "/api/ledger/admin/expenses/" + expense, null).andExpect(status().isForbidden());
		assertThat(jdbc.sql("SELECT count(*) FROM ledger.expense").query(Long.class).single()).isEqualTo(1);
	}

	@Test
	void ownerSharesSplitTheTotalButCreateNoDebt() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);
		createGroup("2024-01-09", "Badminton", participants(anna, "2", ben, "1"), 3, "\"shareAmount\":23000");

		assertThat(balanceOf(anna)).isEqualTo(46000);
		assertThat(balanceOf(ben)).isEqualTo(23000);
		send(admin(), "GET", "/api/ledger/admin/expenses", null).andExpect(jsonPath("$[0].totalShares").value(6))
			.andExpect(jsonPath("$[0].total").value(138000))
			.andExpect(jsonPath("$[0].ownerShares").value(3));
	}

	@Test
	void aTotalIsSplitAcrossAllSharesAndRoundedUpToTheNextThousand() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);

		send(admin(), "POST", "/api/ledger/admin/expenses", """
				{"type":"GROUP","date":"2024-01-09","note":"Court","participants":%s,"ownerShares":1,"total":100000}
				""".formatted(participants(anna, "1", ben, "1"))).andExpect(status().isCreated())
			.andExpect(jsonPath("$.shareAmount").value(34000))
			.andExpect(jsonPath("$.totalShares").value(3))
			.andExpect(jsonPath("$.total").value(102000));
		assertThat(balanceOf(anna)).isEqualTo(34000);
	}

	@Test
	void editingAnExpenseChangesEveryParticipantsLineAtOnce() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);
		String expense = createGroup("2024-01-09", "Badminton", participants(anna, "1", ben, "1"), 0, "\"shareAmount\":20000");
		assertThat(balanceOf(anna)).isEqualTo(20000);
		assertThat(balanceOf(ben)).isEqualTo(20000);

		send(admin(), "PUT", "/api/ledger/admin/expenses/" + expense, """
				{"type":"GROUP","date":"2024-02-01","note":"Court fee","participants":%s,"ownerShares":1,"shareAmount":25000}
				""".formatted(participants(anna, "1", ben, "2"))).andExpect(status().isOk());

		assertThat(balanceOf(anna)).isEqualTo(25000);
		assertThat(balanceOf(ben)).isEqualTo(50000);
		send(friend(ANNA), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.history[0].note").value("Court fee"))
			.andExpect(jsonPath("$.member.history[0].date").value("2024-02-01"))
			.andExpect(jsonPath("$.member.history[0].totalShares").value(4));
		send(friend(BEN), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.history[0].shares").value(2));

		send(admin(), "DELETE", "/api/ledger/admin/expenses/" + expense, null).andExpect(status().isNoContent());
		assertThat(balanceOf(anna)).isZero();
		assertThat(balanceOf(ben)).isZero();
		assertThat(jdbc.sql("SELECT count(*) FROM ledger.expense_share").query(Long.class).single()).isZero();
	}

	@Test
	void removingAParticipantFromAnEditedExpenseDropsTheirLine() throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);
		String expense = createGroup("2024-01-09", "Badminton", participants(anna, "1", ben, "1"), 0, "\"shareAmount\":20000");

		send(admin(), "PUT", "/api/ledger/admin/expenses/" + expense, """
				{"type":"GROUP","date":"2024-01-09","note":"Badminton","participants":%s,"shareAmount":20000}
				""".formatted(participants(anna, "1"))).andExpect(status().isOk());

		assertThat(balanceOf(ben)).isZero();
		send(friend(BEN), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.history", hasSize(0)));
	}

	@Test
	void paymentsCanBeEditedAndDeleted() throws Exception {
		String anna = createMember("Anna", ANNA);
		createGroup("2024-01-09", "Badminton", participants(anna, "1"), 0, "\"shareAmount\":20000");
		String payment = com.jayway.jsonpath.JsonPath.read(body(send(admin(), "POST", "/api/ledger/admin/payments", """
				{"memberId":"%s","date":"2024-01-10","amount":5000}
				""".formatted(anna)).andExpect(status().isCreated()).andExpect(jsonPath("$.note").value("Paid"))), "$.id");
		assertThat(balanceOf(anna)).isEqualTo(15000);

		send(admin(), "PUT", "/api/ledger/admin/payments/" + payment, """
				{"memberId":"%s","date":"2024-01-10","amount":8000,"note":"Cash"}
				""".formatted(anna)).andExpect(status().isOk()).andExpect(jsonPath("$.note").value("Cash"));
		assertThat(balanceOf(anna)).isEqualTo(12000);

		send(admin(), "DELETE", "/api/ledger/admin/payments/" + payment, null).andExpect(status().isNoContent());
		assertThat(balanceOf(anna)).isEqualTo(20000);
		send(admin(), "DELETE", "/api/ledger/admin/payments/" + payment, null).andExpect(status().isNotFound());
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1},{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":1000",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":1000,\"total\":5000",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}]",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":0}],\"shareAmount\":1000",
			"\"type\":\"GROUP\",\"participants\":[],\"shareAmount\":1000",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":-5",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":0",
			"\"type\":\"GROUP\",\"participants\":[{\"memberId\":\"00000000-0000-0000-0000-000000000001\",\"shares\":1}],\"shareAmount\":1000",
			"\"type\":\"PERSONAL\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1},{\"memberId\":\"%2$s\",\"shares\":1}],\"shareAmount\":1000",
			"\"type\":\"PERSONAL\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":2}],\"shareAmount\":1000",
			"\"type\":\"PERSONAL\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"total\":1000",
			"\"type\":\"PERSONAL\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":1000,\"ownerShares\":1",
			"\"type\":\"BOWLING\",\"participants\":[{\"memberId\":\"%1$s\",\"shares\":1}],\"shareAmount\":1000" })
	void invalidExpensesAreRejectedAndNothingIsStored(String fields) throws Exception {
		String anna = createMember("Anna", ANNA);
		String ben = createMember("Ben", BEN);

		send(admin(), "POST", "/api/ledger/admin/expenses",
				"{\"date\":\"2024-01-09\",\"note\":\"Badminton\"," + fields.formatted(anna, ben) + "}")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error").isNotEmpty());
		assertThat(jdbc.sql("SELECT count(*) FROM ledger.expense").query(Long.class).single()).isZero();
	}

	@Test
	void anExpenseNeedsADateAndANonBlankNote() throws Exception {
		String anna = createMember("Anna", ANNA);
		String people = participants(anna, "1");

		send(admin(), "POST", "/api/ledger/admin/expenses", """
				{"type":"GROUP","date":"2024-01-09","note":"   ","participants":%s,"shareAmount":1000}
				""".formatted(people)).andExpect(status().isBadRequest());
		send(admin(), "POST", "/api/ledger/admin/expenses", """
				{"type":"GROUP","note":"Badminton","participants":%s,"shareAmount":1000}
				""".formatted(people)).andExpect(status().isBadRequest());
		send(admin(), "POST", "/api/ledger/admin/expenses", """
				{"type":"GROUP","date":"not-a-date","note":"Badminton","participants":%s,"shareAmount":1000}
				""".formatted(people)).andExpect(status().isBadRequest());
	}

	@Test
	void paymentsNeedAPositiveAmountAndAKnownMember() throws Exception {
		String anna = createMember("Anna", ANNA);

		send(admin(), "POST", "/api/ledger/admin/payments", """
				{"memberId":"%s","date":"2024-01-10","amount":0}
				""".formatted(anna)).andExpect(status().isBadRequest());
		send(admin(), "POST", "/api/ledger/admin/payments", """
				{"memberId":"00000000-0000-0000-0000-000000000001","date":"2024-01-10","amount":1000}
				""").andExpect(status().isBadRequest());
	}

	@Test
	void namesAndEmailsAreUniqueIgnoringCase() throws Exception {
		createMember("Anna", "Anna@Example.com");

		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"anna\"}").andExpect(status().isConflict());
		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"Other\",\"email\":\"ANNA@example.COM\"}")
			.andExpect(status().isConflict());
		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"No email\"}").andExpect(status().isCreated());
		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"Also none\",\"email\":\"\"}").andExpect(status().isCreated());
		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"Bad\",\"email\":\"not an email\"}").andExpect(status().isBadRequest());
	}

	@Test
	void memberNamesAreStoredNormalisedSoDecomposedAndComposedFormsCollide() throws Exception {
		createMember("Bình", null);

		send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"Bi\u0300nh\"}").andExpect(status().isConflict());
		assertThat(jdbc.sql("SELECT name FROM ledger.member").query(String.class).single()).isEqualTo("Bình");
		String decomposed = body(send(admin(), "POST", "/api/ledger/admin/members", "{\"name\":\"Xa\u0300\"}").andExpect(status().isCreated()));
		assertThat(com.jayway.jsonpath.JsonPath.<String>read(decomposed, "$.name")).isEqualTo("Xà");
	}

	@Test
	void membersCanBeRenamedRelinkedAndDeletedOnlyWithoutEntries() throws Exception {
		String anna = createMember("Anna", ANNA);
		createGroup("2024-01-09", "Badminton", participants(anna, "1"), 0, "\"shareAmount\":20000");

		send(admin(), "PUT", "/api/ledger/admin/members/" + anna, "{\"name\":\"Annie\",\"email\":\"" + BEN + "\"}")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Annie"))
			.andExpect(jsonPath("$.balance").value(20000));
		send(friend(BEN), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member.name").value("Annie"));
		send(friend(ANNA), "GET", "/api/ledger/me", null).andExpect(jsonPath("$.member").doesNotExist());

		send(admin(), "DELETE", "/api/ledger/admin/members/" + anna, null).andExpect(status().isConflict());
		String empty = createMember("Empty", null);
		send(admin(), "DELETE", "/api/ledger/admin/members/" + empty, null).andExpect(status().isNoContent());
		send(admin(), "DELETE", "/api/ledger/admin/members/" + empty, null).andExpect(status().isNotFound());
	}

	@Test
	void theMemberListCarriesBalancesAndTheExpenseListIsNewestFirst() throws Exception {
		String anna = createMember("Anna", ANNA);
		createMember("Ben", null);
		createGroup("2024-01-09", "Older", participants(anna, "1"), 0, "\"shareAmount\":1000");
		createGroup("2024-03-09", "Newer", participants(anna, "1"), 0, "\"shareAmount\":2000");

		send(admin(), "GET", "/api/ledger/admin/members", null).andExpect(jsonPath("$[0].name").value("Anna"))
			.andExpect(jsonPath("$[0].balance").value(3000))
			.andExpect(jsonPath("$[1].balance").value(0));
		send(admin(), "GET", "/api/ledger/admin/expenses", null).andExpect(jsonPath("$[0].note").value("Newer"))
			.andExpect(jsonPath("$[0].participants[0].name").value("Anna"))
			.andExpect(jsonPath("$[1].note").value("Older"));
		send(admin(), "GET", "/api/ledger/admin/expenses?limit=1&offset=1", null).andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].note").value("Older"));
	}

}
