package com.superapp.ledger;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("ledger")
record LedgerProperties(List<String> adminEmails) {

	LedgerProperties {
		adminEmails = adminEmails == null ? List.of() : List.copyOf(adminEmails);
	}

}
