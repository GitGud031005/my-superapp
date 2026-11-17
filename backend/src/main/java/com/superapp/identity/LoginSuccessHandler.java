package com.superapp.identity;

import java.io.IOException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
class LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

	private final AppUserRepository users;

	LoginSuccessHandler(AppUserRepository users) {
		super("/ledger");
		setAlwaysUseDefaultTargetUrl(true);
		this.users = users;
	}

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException, ServletException {
		OAuth2User principal = (OAuth2User) authentication.getPrincipal();
		String email = principal.getAttribute("email");
		String name = principal.getAttribute("name");
		users.upsert(principal.getName(), email, name != null ? name : email, principal.getAttribute("picture"));
		super.onAuthenticationSuccess(request, response, authentication);
	}

}
