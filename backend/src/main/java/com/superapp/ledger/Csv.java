package com.superapp.ledger;

import java.util.ArrayList;
import java.util.List;

/** Minimal RFC 4180 reader. Excel writes the regional list separator, so the delimiter is detected from the header line. */
final class Csv {

	private Csv() {
	}

	static List<List<String>> parse(String text) {
		String input = text.startsWith("﻿") ? text.substring(1) : text;
		char delimiter = detectDelimiter(input);
		List<List<String>> records = new ArrayList<>();
		List<String> record = new ArrayList<>();
		StringBuilder field = new StringBuilder();
		boolean quoted = false;
		boolean pending = false;
		for (int i = 0; i < input.length(); i++) {
			char c = input.charAt(i);
			if (quoted) {
				if (c == '"' && i + 1 < input.length() && input.charAt(i + 1) == '"') {
					field.append('"');
					i++;
				}
				else if (c == '"') {
					quoted = false;
				}
				else {
					field.append(c);
				}
			}
			else if (c == '"') {
				quoted = true;
				pending = true;
			}
			else if (c == delimiter) {
				record.add(field.toString());
				field.setLength(0);
				pending = true;
			}
			else if (c == '\n' || c == '\r') {
				if (c == '\r' && i + 1 < input.length() && input.charAt(i + 1) == '\n') {
					i++;
				}
				record.add(field.toString());
				records.add(record);
				record = new ArrayList<>();
				field.setLength(0);
				pending = false;
			}
			else {
				field.append(c);
				pending = true;
			}
		}
		if (pending || !record.isEmpty()) {
			record.add(field.toString());
			records.add(record);
		}
		return records;
	}

	private static char detectDelimiter(String input) {
		int commas = 0;
		int semicolons = 0;
		int tabs = 0;
		boolean quoted = false;
		for (int i = 0; i < input.length(); i++) {
			char c = input.charAt(i);
			if (c == '"') {
				quoted = !quoted;
			}
			else if (!quoted && (c == '\n' || c == '\r')) {
				break;
			}
			else if (!quoted) {
				if (c == ',') {
					commas++;
				}
				else if (c == ';') {
					semicolons++;
				}
				else if (c == '\t') {
					tabs++;
				}
			}
		}
		if (semicolons > commas && semicolons >= tabs) {
			return ';';
		}
		if (tabs > commas) {
			return '\t';
		}
		return ',';
	}

}
