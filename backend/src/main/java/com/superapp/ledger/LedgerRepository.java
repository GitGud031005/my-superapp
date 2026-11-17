package com.superapp.ledger;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.superapp.ledger.LedgerApi.Expense;
import com.superapp.ledger.LedgerApi.Member;
import com.superapp.ledger.LedgerApi.Participant;
import com.superapp.ledger.LedgerApi.Payment;

@Repository
class LedgerRepository {

	private static final String MEMBER_WITH_BALANCE = """
			SELECT m.id, m.name, m.email,
				(COALESCE((SELECT sum(e.share_amount * s.shares) FROM ledger.expense_share s
						JOIN ledger.expense e ON e.id = s.expense_id WHERE s.member_id = m.id), 0)
				- COALESCE((SELECT sum(p.amount) FROM ledger.payment p WHERE p.member_id = m.id), 0))::bigint AS balance
			FROM ledger.member m
			""";

	record Entry(UUID id, LedgerApi.Line.Kind kind, ExpenseType type, LocalDate date, String note, long amount, Long shareAmount,
			Integer shares, Integer totalShares, OffsetDateTime createdAt) {

	}

	record ExpenseData(ExpenseType type, LocalDate date, String note, long shareAmount, int ownerShares, Map<UUID, Integer> shares) {

	}

	private final JdbcClient jdbc;

	LedgerRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	List<Member> members() {
		return jdbc.sql(MEMBER_WITH_BALANCE + " ORDER BY lower(m.name)").query(Member.class).list();
	}

	Optional<Member> member(UUID id) {
		return jdbc.sql(MEMBER_WITH_BALANCE + " WHERE m.id = :id").param("id", id).query(Member.class).optional();
	}

	Optional<Member> memberByEmail(String email) {
		return jdbc.sql(MEMBER_WITH_BALANCE + " WHERE lower(m.email) = :email").param("email", email).query(Member.class).optional();
	}

	Member insertMember(String name, String email) {
		UUID id = jdbc.sql("INSERT INTO ledger.member (name, email) VALUES (:name, :email) RETURNING id")
			.param("name", name)
			.param("email", email)
			.query(UUID.class)
			.single();
		return member(id).orElseThrow();
	}

	boolean updateMember(UUID id, String name, String email) {
		return jdbc.sql("UPDATE ledger.member SET name = :name, email = :email WHERE id = :id")
			.param("id", id)
			.param("name", name)
			.param("email", email)
			.update() == 1;
	}

	boolean memberHasEntries(UUID id) {
		return jdbc.sql("""
				SELECT EXISTS (SELECT 1 FROM ledger.expense_share WHERE member_id = :id)
					OR EXISTS (SELECT 1 FROM ledger.payment WHERE member_id = :id)
				""").param("id", id).query(Boolean.class).single();
	}

	boolean deleteMember(UUID id) {
		return jdbc.sql("DELETE FROM ledger.member WHERE id = :id").param("id", id).update() == 1;
	}

	Set<UUID> existingMemberIds(Collection<UUID> ids) {
		return jdbc.sql("SELECT id FROM ledger.member WHERE id IN (:ids)")
			.param("ids", ids)
			.query(UUID.class)
			.list()
			.stream()
			.collect(Collectors.toSet());
	}

	List<Entry> entries(UUID memberId) {
		List<Entry> entries = new ArrayList<>(jdbc.sql("""
				SELECT e.id, e.type, e.occurred_on, e.note, e.share_amount, s.shares, e.created_at,
					(SELECT sum(x.shares) FROM ledger.expense_share x WHERE x.expense_id = e.id) + e.owner_shares AS total_shares
				FROM ledger.expense_share s JOIN ledger.expense e ON e.id = s.expense_id
				WHERE s.member_id = :member
				""").param("member", memberId).query((rs, row) -> expenseEntry(rs)).list());
		entries.addAll(jdbc.sql("""
				SELECT id, occurred_on, note, amount, created_at FROM ledger.payment WHERE member_id = :member
				""")
			.param("member", memberId)
			.query((rs, row) -> new Entry(rs.getObject("id", UUID.class), LedgerApi.Line.Kind.PAYMENT, null,
					rs.getObject("occurred_on", LocalDate.class), rs.getString("note"), rs.getLong("amount"), null, null, null,
					rs.getObject("created_at", OffsetDateTime.class)))
			.list());
		return entries;
	}

	private static Entry expenseEntry(ResultSet rs) throws SQLException {
		long shareAmount = rs.getLong("share_amount");
		int shares = rs.getInt("shares");
		ExpenseType type = ExpenseType.valueOf(rs.getString("type"));
		return new Entry(rs.getObject("id", UUID.class), LedgerApi.Line.Kind.EXPENSE, type, rs.getObject("occurred_on", LocalDate.class),
				rs.getString("note"), shareAmount * shares, shareAmount, shares, rs.getInt("total_shares"),
				rs.getObject("created_at", OffsetDateTime.class));
	}

	UUID insertExpense(ExpenseData data) {
		UUID id = jdbc.sql("""
				INSERT INTO ledger.expense (type, occurred_on, note, share_amount, owner_shares)
				VALUES (:type, :date, :note, :shareAmount, :ownerShares) RETURNING id
				""")
			.param("type", data.type().name())
			.param("date", data.date())
			.param("note", data.note())
			.param("shareAmount", data.shareAmount())
			.param("ownerShares", data.ownerShares())
			.query(UUID.class)
			.single();
		insertShares(id, data.shares());
		return id;
	}

	boolean updateExpense(UUID id, ExpenseData data) {
		int updated = jdbc.sql("""
				UPDATE ledger.expense
				SET type = :type, occurred_on = :date, note = :note, share_amount = :shareAmount, owner_shares = :ownerShares,
					updated_at = clock_timestamp()
				WHERE id = :id
				""")
			.param("id", id)
			.param("type", data.type().name())
			.param("date", data.date())
			.param("note", data.note())
			.param("shareAmount", data.shareAmount())
			.param("ownerShares", data.ownerShares())
			.update();
		if (updated == 0) {
			return false;
		}
		jdbc.sql("DELETE FROM ledger.expense_share WHERE expense_id = :id").param("id", id).update();
		insertShares(id, data.shares());
		return true;
	}

	private void insertShares(UUID expenseId, Map<UUID, Integer> shares) {
		shares.forEach((memberId, count) -> jdbc
			.sql("INSERT INTO ledger.expense_share (expense_id, member_id, shares) VALUES (:expense, :member, :shares)")
			.param("expense", expenseId)
			.param("member", memberId)
			.param("shares", count)
			.update());
	}

	boolean deleteExpense(UUID id) {
		return jdbc.sql("DELETE FROM ledger.expense WHERE id = :id").param("id", id).update() == 1;
	}

	List<Expense> expenses(int limit, int offset) {
		return withParticipants(jdbc.sql("""
				SELECT id, type, occurred_on, note, share_amount, owner_shares FROM ledger.expense
				ORDER BY occurred_on DESC, created_at DESC, id LIMIT :limit OFFSET :offset
				""").param("limit", limit).param("offset", offset).query((rs, row) -> expenseRow(rs)).list());
	}

	Optional<Expense> expense(UUID id) {
		return withParticipants(jdbc
			.sql("SELECT id, type, occurred_on, note, share_amount, owner_shares FROM ledger.expense WHERE id = :id")
			.param("id", id)
			.query((rs, row) -> expenseRow(rs))
			.list()).stream().findFirst();
	}

	private static Expense expenseRow(ResultSet rs) throws SQLException {
		return new Expense(rs.getObject("id", UUID.class), ExpenseType.valueOf(rs.getString("type")), rs.getObject("occurred_on", LocalDate.class),
				rs.getString("note"), rs.getLong("share_amount"), rs.getInt("owner_shares"), 0, 0, List.of());
	}

	private List<Expense> withParticipants(List<Expense> expenses) {
		if (expenses.isEmpty()) {
			return expenses;
		}
		Map<UUID, List<Participant>> byExpense = new LinkedHashMap<>();
		jdbc.sql("""
				SELECT s.expense_id, s.member_id, m.name, s.shares
				FROM ledger.expense_share s JOIN ledger.member m ON m.id = s.member_id
				WHERE s.expense_id IN (:ids) ORDER BY lower(m.name)
				""")
			.param("ids", expenses.stream().map(Expense::id).toList())
			.query((rs, row) -> Map.entry(rs.getObject("expense_id", UUID.class),
					new Participant(rs.getObject("member_id", UUID.class), rs.getString("name"), rs.getInt("shares"))))
			.list()
			.forEach((entry) -> byExpense.computeIfAbsent(entry.getKey(), (key) -> new ArrayList<>()).add(entry.getValue()));
		return expenses.stream().map((expense) -> {
			List<Participant> participants = byExpense.getOrDefault(expense.id(), List.of());
			int totalShares = participants.stream().mapToInt(Participant::shares).sum() + expense.ownerShares();
			return new Expense(expense.id(), expense.type(), expense.date(), expense.note(), expense.shareAmount(), expense.ownerShares(),
					totalShares, expense.shareAmount() * totalShares, participants);
		}).toList();
	}

	Payment insertPayment(UUID memberId, LocalDate date, long amount, String note) {
		return jdbc.sql("""
				INSERT INTO ledger.payment (member_id, occurred_on, amount, note) VALUES (:member, :date, :amount, :note)
				RETURNING id, member_id, occurred_on, amount, note
				""")
			.param("member", memberId)
			.param("date", date)
			.param("amount", amount)
			.param("note", note)
			.query((rs, row) -> paymentRow(rs))
			.single();
	}

	Optional<Payment> updatePayment(UUID id, UUID memberId, LocalDate date, long amount, String note) {
		return jdbc.sql("""
				UPDATE ledger.payment SET member_id = :member, occurred_on = :date, amount = :amount, note = :note WHERE id = :id
				RETURNING id, member_id, occurred_on, amount, note
				""")
			.param("id", id)
			.param("member", memberId)
			.param("date", date)
			.param("amount", amount)
			.param("note", note)
			.query((rs, row) -> paymentRow(rs))
			.optional();
	}

	boolean deletePayment(UUID id) {
		return jdbc.sql("DELETE FROM ledger.payment WHERE id = :id").param("id", id).update() == 1;
	}

	private static Payment paymentRow(ResultSet rs) throws SQLException {
		return new Payment(rs.getObject("id", UUID.class), rs.getObject("member_id", UUID.class), rs.getObject("occurred_on", LocalDate.class),
				rs.getLong("amount"), rs.getString("note"));
	}

}
