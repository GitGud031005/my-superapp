package com.superapp.ledger;

import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Whole đồng from the spellings people type: {@code 56k}, {@code 22.5k}, {@code 56000}, {@code 56.000}. */
final class Amounts {

	private static final Pattern THOUSANDS = Pattern.compile("(\\d{1,12})(?:[.,](\\d{1,3}))?k", Pattern.CASE_INSENSITIVE);

	private static final Pattern GROUPED = Pattern.compile("\\d{1,3}(?:[.,]\\d{3})+");

	private static final Pattern PLAIN = Pattern.compile("\\d{1,15}");

	private Amounts() {
	}

	static OptionalLong parse(String text) {
		String value = text.strip();
		Matcher thousands = THOUSANDS.matcher(value);
		if (thousands.matches()) {
			String fraction = thousands.group(2) == null ? "000" : (thousands.group(2) + "00").substring(0, 3);
			return OptionalLong.of(Long.parseLong(thousands.group(1)) * 1000 + Long.parseLong(fraction));
		}
		if (GROUPED.matcher(value).matches()) {
			return OptionalLong.of(Long.parseLong(value.replaceAll("[.,]", "")));
		}
		if (PLAIN.matcher(value).matches()) {
			return OptionalLong.of(Long.parseLong(value));
		}
		return OptionalLong.empty();
	}

}
