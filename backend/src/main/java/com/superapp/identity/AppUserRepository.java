package com.superapp.identity;

import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class AppUserRepository {

	private final JdbcClient jdbc;

	AppUserRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	AppUser upsert(String googleSubject, String email, String displayName, String pictureUrl) {
		return jdbc.sql("""
				INSERT INTO identity.app_user (google_subject, email, display_name, picture_url)
				VALUES (:subject, :email, :displayName, :pictureUrl)
				ON CONFLICT (google_subject) DO UPDATE
				SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, picture_url = EXCLUDED.picture_url
				RETURNING id, email, display_name, picture_url
				""")
			.param("subject", googleSubject)
			.param("email", email)
			.param("displayName", displayName)
			.param("pictureUrl", pictureUrl)
			.query(AppUser.class)
			.single();
	}

	Optional<AppUser> findByGoogleSubject(String googleSubject) {
		return jdbc.sql("SELECT id, email, display_name, picture_url FROM identity.app_user WHERE google_subject = :subject")
			.param("subject", googleSubject)
			.query(AppUser.class)
			.optional();
	}

}
