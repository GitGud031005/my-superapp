package com.superapp.identity;

import java.util.Locale;
import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;

/**
 * The signed-in person as Google described them at login. {@code email} is lower-case; other modules
 * must only trust it for access decisions when {@code emailVerified} is true.
 */
public record CurrentUser(String email, boolean emailVerified) {

	public static Optional<CurrentUser> from(Authentication authentication) {
		if (authentication == null || !(authentication.getPrincipal() instanceof OAuth2User principal)) {
			return Optional.empty();
		}
		Object email = principal.getAttribute("email");
		if (!(email instanceof String address) || address.isBlank()) {
			return Optional.empty();
		}
		Object verified = principal.getAttribute("email_verified");
		boolean emailVerified = verified instanceof Boolean flag ? flag : verified instanceof String text && Boolean.parseBoolean(text);
		return Optional.of(new CurrentUser(address.strip().toLowerCase(Locale.ROOT), emailVerified));
	}

}
