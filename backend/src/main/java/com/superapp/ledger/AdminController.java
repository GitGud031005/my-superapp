package com.superapp.ledger;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.superapp.ledger.LedgerApi.Expense;
import com.superapp.ledger.LedgerApi.ExpenseInput;
import com.superapp.ledger.LedgerApi.Member;
import com.superapp.ledger.LedgerApi.MemberHistory;
import com.superapp.ledger.LedgerApi.MemberInput;
import com.superapp.ledger.LedgerApi.Payment;
import com.superapp.ledger.LedgerApi.PaymentInput;

@RestController
@RequestMapping("/api/ledger/admin")
class AdminController {

	private final LedgerService service;

	AdminController(LedgerService service) {
		this.service = service;
	}

	@GetMapping("/members")
	List<Member> members() {
		return service.members();
	}

	@PostMapping("/members")
	@ResponseStatus(HttpStatus.CREATED)
	Member createMember(@Valid @RequestBody MemberInput input) {
		return service.createMember(input);
	}

	@PutMapping("/members/{id}")
	Member updateMember(@PathVariable UUID id, @Valid @RequestBody MemberInput input) {
		return service.updateMember(id, input);
	}

	@DeleteMapping("/members/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteMember(@PathVariable UUID id) {
		service.deleteMember(id);
	}

	@GetMapping("/members/{id}/history")
	MemberHistory history(@PathVariable UUID id) {
		return service.history(id);
	}

	@GetMapping("/expenses")
	List<Expense> expenses(@RequestParam(defaultValue = "100") int limit, @RequestParam(defaultValue = "0") int offset) {
		return service.expenses(limit, offset);
	}

	@PostMapping("/expenses")
	@ResponseStatus(HttpStatus.CREATED)
	Expense createExpense(@Valid @RequestBody ExpenseInput input) {
		return service.createExpense(input);
	}

	@PutMapping("/expenses/{id}")
	Expense updateExpense(@PathVariable UUID id, @Valid @RequestBody ExpenseInput input) {
		return service.updateExpense(id, input);
	}

	@DeleteMapping("/expenses/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteExpense(@PathVariable UUID id) {
		service.deleteExpense(id);
	}

	@PostMapping("/payments")
	@ResponseStatus(HttpStatus.CREATED)
	Payment createPayment(@Valid @RequestBody PaymentInput input) {
		return service.createPayment(input);
	}

	@PutMapping("/payments/{id}")
	Payment updatePayment(@PathVariable UUID id, @Valid @RequestBody PaymentInput input) {
		return service.updatePayment(id, input);
	}

	@DeleteMapping("/payments/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deletePayment(@PathVariable UUID id) {
		service.deletePayment(id);
	}

}
