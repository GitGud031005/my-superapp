package com.superapp.ledger;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.jayway.jsonpath.JsonPath;
import com.superapp.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = "ledger.admin-emails=Boss@Example.com, second.admin@example.com")
@AutoConfigureMockMvc
abstract class LedgerTestSupport {

	static final String ADMIN_EMAIL = "boss@example.com";

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcClient jdbc;

	@BeforeEach
	void cleanLedger() {
		jdbc.sql("DELETE FROM ledger.payment").update();
		jdbc.sql("DELETE FROM ledger.expense").update();
		jdbc.sql("DELETE FROM ledger.member").update();
	}

	static RequestPostProcessor signedIn(String email, boolean verified) {
		return oauth2Login().attributes((attributes) -> {
			attributes.put("sub", "sub-" + email);
			attributes.put("email", email);
			attributes.put("email_verified", verified);
		});
	}

	static RequestPostProcessor admin() {
		return signedIn("Boss@Example.com", true);
	}

	static RequestPostProcessor friend(String email) {
		return signedIn(email, true);
	}

	ResultActions send(RequestPostProcessor who, String method, String url, String json) throws Exception {
		var request = switch (method) {
			case "POST" -> post(url);
			case "PUT" -> put(url);
			case "DELETE" -> delete(url);
			default -> get(url);
		};
		if (json != null) {
			request.contentType(MediaType.APPLICATION_JSON).content(json);
		}
		return mvc.perform(withCsrf(request, who));
	}

	<B extends AbstractMockHttpServletRequestBuilder<B>> B withCsrf(B request, RequestPostProcessor who) throws Exception {
		String token = mvc.perform(get("/api/ledger/me").with(who)).andReturn().getResponse().getCookie("XSRF-TOKEN").getValue();
		return request.with(who).cookie(new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token);
	}

	String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	String createMember(String name, String email) throws Exception {
		String json = email == null ? "{\"name\":\"%s\"}".formatted(name)
				: "{\"name\":\"%s\",\"email\":\"%s\"}".formatted(name, email);
		return JsonPath.read(body(send(admin(), "POST", "/api/ledger/admin/members", json).andExpect(status().isCreated())), "$.id");
	}

	String createGroup(String date, String note, String participantsJson, int ownerShares, String pricing) throws Exception {
		String json = """
				{"type":"GROUP","date":"%s","note":"%s","participants":%s,"ownerShares":%d,%s}
				""".formatted(date, note, participantsJson, ownerShares, pricing);
		return JsonPath.read(body(send(admin(), "POST", "/api/ledger/admin/expenses", json).andExpect(status().isCreated())), "$.id");
	}

	static String participants(String... idAndShares) {
		StringBuilder json = new StringBuilder("[");
		for (int i = 0; i < idAndShares.length; i += 2) {
			json.append(i == 0 ? "" : ",").append("{\"memberId\":\"%s\",\"shares\":%s}".formatted(idAndShares[i], idAndShares[i + 1]));
		}
		return json.append("]").toString();
	}

	long balanceOf(String memberId) throws Exception {
		Number balance = JsonPath.read(body(send(admin(), "GET", "/api/ledger/admin/members/" + memberId + "/history", null)), "$.member.balance");
		return balance.longValue();
	}

}
