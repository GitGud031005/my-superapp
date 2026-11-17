package com.superapp.ledger;

import org.springframework.http.HttpStatus;

class LedgerException extends RuntimeException {

	private final HttpStatus status;

	LedgerException(HttpStatus status, String message) {
		super(message);
		this.status = status;
	}

	HttpStatus status() {
		return status;
	}

}
