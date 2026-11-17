package com.superapp.identity;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
class MeController {

	private final AppUserRepository users;

	MeController(AppUserRepository users) {
		this.users = users;
	}

	@GetMapping("/api/me")
	MeResponse me(@AuthenticationPrincipal OAuth2User principal) {
		AppUser user = users.findByGoogleSubject(principal.getName())
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
		return new MeResponse(user.id(), user.email(), user.displayName(), user.pictureUrl());
	}

	record MeResponse(UUID id, String email, String name, String pictureUrl) {

	}

}
