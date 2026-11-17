package com.superapp.ledger;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.superapp.identity.CurrentUser;

/** The admin is whoever signs in with a verified email listed in {@code LEDGER_ADMIN_EMAILS}. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(LedgerProperties.class)
class LedgerAccess implements WebMvcConfigurer {

	private final Set<String> admins;

	LedgerAccess(LedgerProperties properties) {
		this.admins = properties.adminEmails()
			.stream()
			.map((email) -> email.strip().toLowerCase(Locale.ROOT))
			.filter((email) -> !email.isEmpty())
			.collect(Collectors.toUnmodifiableSet());
	}

	boolean isAdmin(CurrentUser user) {
		return user.emailVerified() && admins.contains(user.email());
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(new HandlerInterceptor() {
			@Override
			public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
				boolean admin = CurrentUser.from(SecurityContextHolder.getContext().getAuthentication()).map(LedgerAccess.this::isAdmin).orElse(false);
				if (!admin) {
					response.setStatus(HttpStatus.FORBIDDEN.value());
					response.setContentType(MediaType.APPLICATION_JSON_VALUE);
					response.getWriter().write("{\"error\":\"Only the ledger admin can do this.\"}");
				}
				return admin;
			}
		}).addPathPatterns("/api/ledger/admin/**");
	}

}
