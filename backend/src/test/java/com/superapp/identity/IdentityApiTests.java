package com.superapp.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.superapp.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class IdentityApiTests {

	private static final String SUBJECT = "google-subject-1";

	@Autowired
	MockMvc mvc;

	@Autowired
	AppUserRepository users;

	@Autowired
	JdbcClient jdbc;

	@BeforeEach
	void cleanDatabase() {
		jdbc.sql("DELETE FROM identity.spring_session").update();
		jdbc.sql("DELETE FROM identity.app_user").update();
	}

	private RequestPostProcessor signedIn() {
		return oauth2Login().attributes((attributes) -> attributes.put("sub", SUBJECT));
	}

	@Test
	void meRejectsAnonymousRequestsWithJsonInsteadOfRedirecting() throws Exception {
		mvc.perform(get("/api/me"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().doesNotExist("Location"))
			.andExpect(jsonPath("$.error").value("unauthenticated"));
	}

	@Test
	void otherApiPathsRequireAuthentication() throws Exception {
		mvc.perform(get("/api/anything")).andExpect(status().isUnauthorized());
	}

	@Test
	void meReturnsTheStoredUser() throws Exception {
		AppUser user = users.upsert(SUBJECT, "ada@example.com", "Ada Lovelace", "https://example.com/ada.png");

		mvc.perform(get("/api/me").with(signedIn()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(user.id().toString()))
			.andExpect(jsonPath("$.email").value("ada@example.com"))
			.andExpect(jsonPath("$.name").value("Ada Lovelace"))
			.andExpect(jsonPath("$.pictureUrl").value("https://example.com/ada.png"));
	}

	@Test
	void meRejectsASessionWhoseUserIsGone() throws Exception {
		mvc.perform(get("/api/me").with(signedIn())).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutWithoutCsrfTokenIsRejected() throws Exception {
		mvc.perform(post("/api/logout").with(signedIn())).andExpect(status().isForbidden());
	}

	@Test
	void logoutWithCsrfCookieAndHeaderReturnsNoContent() throws Exception {
		users.upsert(SUBJECT, "ada@example.com", "Ada Lovelace", null);

		String token = mvc.perform(get("/api/me").with(signedIn()))
			.andExpect(cookie().exists("XSRF-TOKEN"))
			.andReturn()
			.getResponse()
			.getCookie("XSRF-TOKEN")
			.getValue();

		mvc.perform(post("/api/logout")
				.with(signedIn())
				.cookie(new Cookie("XSRF-TOKEN", token))
				.header("X-XSRF-TOKEN", token))
			.andExpect(status().isNoContent());
	}

	@Test
	void healthEndpointsArePublic() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk());
		mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
		mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
	}

	@Test
	void anonymousRequestsDoNotCreateSessionRows() throws Exception {
		mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
		mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());

		assertThat(jdbc.sql("SELECT count(*) FROM identity.spring_session").query(Long.class).single()).isZero();
	}

	@Test
	void sessionCleanupIsNotScheduled() {
		assertThat(Thread.getAllStackTraces().keySet()).noneMatch((thread) -> thread.getName().startsWith("spring-session-"));
	}

	@Test
	void oauthEndpointsLiveUnderApi() throws Exception {
		mvc.perform(get("/api/oauth2/authorization/google"))
			.andExpect(status().is3xxRedirection())
			.andExpect(header().string("Location", org.hamcrest.Matchers.containsString("accounts.google.com")))
			.andExpect(header().string("Location", org.hamcrest.Matchers.containsString("redirect_uri=http://localhost/api/login/oauth2/code/google")));
	}

}
