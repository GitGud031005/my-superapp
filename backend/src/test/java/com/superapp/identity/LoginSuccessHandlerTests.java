package com.superapp.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import com.superapp.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class LoginSuccessHandlerTests {

	@Autowired
	LoginSuccessHandler handler;

	@Autowired
	JdbcClient jdbc;

	@BeforeEach
	void cleanDatabase() {
		jdbc.sql("DELETE FROM identity.app_user").update();
	}

	private OAuth2AuthenticationToken login(String subject, String email, String name) {
		Map<String, Object> attributes = name == null
				? Map.of("sub", subject, "email", email)
				: Map.of("sub", subject, "email", email, "name", name, "picture", "https://example.com/p.png");
		DefaultOAuth2User user = new DefaultOAuth2User(AuthorityUtils.createAuthorityList("ROLE_USER"), attributes, "sub");
		return new OAuth2AuthenticationToken(user, List.of(), "google");
	}

	private MockHttpServletResponse signIn(OAuth2AuthenticationToken token) throws Exception {
		MockHttpServletResponse response = new MockHttpServletResponse();
		handler.onAuthenticationSuccess(new MockHttpServletRequest(), response, token);
		return response;
	}

	@Test
	void firstLoginCreatesTheUserAndRedirectsToTheLedger() throws Exception {
		MockHttpServletResponse response = signIn(login("sub-1", "ada@example.com", "Ada Lovelace"));

		assertThat(response.getRedirectedUrl()).isEqualTo("/ledger");
		assertThat(jdbc.sql("SELECT count(*) FROM identity.app_user").query(Long.class).single()).isEqualTo(1);
		assertThat(jdbc.sql("SELECT display_name FROM identity.app_user WHERE google_subject = 'sub-1'")
			.query(String.class).single()).isEqualTo("Ada Lovelace");
	}

	@Test
	void repeatLoginUpdatesTheSameRow() throws Exception {
		signIn(login("sub-1", "ada@example.com", "Ada Lovelace"));
		var firstId = jdbc.sql("SELECT id FROM identity.app_user").query(java.util.UUID.class).single();

		signIn(login("sub-1", "ada@new.example.com", "Ada King"));

		assertThat(jdbc.sql("SELECT count(*) FROM identity.app_user").query(Long.class).single()).isEqualTo(1);
		assertThat(jdbc.sql("SELECT id FROM identity.app_user").query(java.util.UUID.class).single()).isEqualTo(firstId);
		assertThat(jdbc.sql("SELECT email FROM identity.app_user").query(String.class).single()).isEqualTo("ada@new.example.com");
		assertThat(jdbc.sql("SELECT display_name FROM identity.app_user").query(String.class).single()).isEqualTo("Ada King");
	}

	@Test
	void missingNameFallsBackToEmail() throws Exception {
		signIn(login("sub-2", "grace@example.com", null));

		assertThat(jdbc.sql("SELECT display_name FROM identity.app_user").query(String.class).single())
			.isEqualTo("grace@example.com");
	}

}
