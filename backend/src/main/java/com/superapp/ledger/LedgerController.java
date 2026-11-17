package com.superapp.ledger;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.identity.CurrentUser;
import com.superapp.ledger.LedgerApi.MyLedger;

@RestController
@RequestMapping("/api/ledger")
class LedgerController {

	private final LedgerService service;

	LedgerController(LedgerService service) {
		this.service = service;
	}

	@GetMapping("/me")
	MyLedger me(Authentication authentication) {
		CurrentUser user = CurrentUser.from(authentication)
			.orElseThrow(() -> new LedgerException(HttpStatus.FORBIDDEN, "Your Google account has no email address."));
		return service.myLedger(user);
	}

}
