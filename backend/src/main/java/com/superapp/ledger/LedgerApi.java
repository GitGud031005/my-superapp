package com.superapp.ledger;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Request and response shapes of {@code /api/ledger}. Money is whole đồng, never fractional. */
final class LedgerApi {

	static final long MAX_AMOUNT = 1_000_000_000L;

	private LedgerApi() {
	}

	record MemberInput(@NotBlank @Size(max = 60) String name, @Email @Size(max = 254) String email) {

	}

	record ParticipantInput(@NotNull UUID memberId, @NotNull @Min(1) @Max(1000) Integer shares) {

	}

	record ExpenseInput(@NotNull ExpenseType type, @NotNull LocalDate date, @NotBlank @Size(max = 200) String note,
			@NotEmpty @Size(max = 200) List<@Valid @NotNull ParticipantInput> participants, @Min(0) @Max(1000) Integer ownerShares,
			@Positive @Max(MAX_AMOUNT) Long shareAmount, @Positive @Max(MAX_AMOUNT * 100) Long total) {

	}

	record PaymentInput(@NotNull UUID memberId, @NotNull LocalDate date, @NotNull @Positive @Max(MAX_AMOUNT * 100) Long amount,
			@Size(max = 200) String note) {

	}

	record Member(UUID id, String name, String email, long balance) {

	}

	/** One line of a member's history; {@code id} is only filled for the admin. */
	@JsonInclude(JsonInclude.Include.NON_NULL)
	record Line(UUID id, Kind kind, ExpenseType type, LocalDate date, String note, long amount, Long shareAmount, Integer shares,
			Integer totalShares, long balance) {

		enum Kind {
			EXPENSE, PAYMENT
		}

		Line withoutId() {
			return new Line(null, kind, type, date, note, amount, shareAmount, shares, totalShares, balance);
		}

	}

	record MemberHistory(Member member, List<Line> history) {

	}

	record Mine(String name, long balance, List<Line> history) {

	}

	record MyLedger(boolean admin, Mine member) {

	}

	record Participant(UUID memberId, String name, int shares) {

	}

	record Expense(UUID id, ExpenseType type, LocalDate date, String note, long shareAmount, int ownerShares, int totalShares, long total,
			List<Participant> participants) {

	}

	record Payment(UUID id, UUID memberId, LocalDate date, long amount, String note) {

	}

	record DetectedName(String name, int expenses, int payments) {

	}

	enum MappingAction {
		NEW, MERGE, IGNORE
	}

	/** What to do with one name found in the spreadsheet: a member called {@code name}, merged into another name, or dropped. */
	record MappingEntry(@NotBlank @Size(max = 200) String source, @NotNull MappingAction action, @Size(max = 60) String name,
			@Size(max = 200) String into) {

	}

	record ImportMember(String name, boolean exists, int expenses, int payments, long balance) {

	}

	/** {@code members} and {@code ignored} stay empty until a mapping is given; the counts then exclude what was ignored. */
	record ImportPreview(boolean ledgerEmpty, int groupExpenses, int personalExpenses, int payments, List<DetectedName> names,
			List<ImportMember> members, List<DetectedName> ignored, List<SpreadsheetParser.Problem> problems) {

	}

}
