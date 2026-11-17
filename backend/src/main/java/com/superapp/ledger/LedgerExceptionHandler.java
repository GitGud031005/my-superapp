package com.superapp.ledger;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackageClasses = LedgerController.class)
class LedgerExceptionHandler {

	@ExceptionHandler(LedgerException.class)
	ResponseEntity<Map<String, String>> ledger(LedgerException ex) {
		return ResponseEntity.status(ex.status()).body(Map.of("error", ex.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException ex) {
		String detail = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.findFirst()
			.map((error) -> error.getField() + " " + error.getDefaultMessage())
			.orElse("is invalid");
		return ResponseEntity.badRequest().body(Map.of("error", "The request is invalid: " + detail + "."));
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
	ResponseEntity<Map<String, String>> unreadable(Exception ex) {
		return ResponseEntity.badRequest().body(Map.of("error", "The request could not be read."));
	}

}
