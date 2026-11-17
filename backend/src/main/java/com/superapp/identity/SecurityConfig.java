package com.superapp.identity;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.RequestCacheConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;

@Configuration(proxyBeanMethods = false)
class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, LoginSuccessHandler loginSuccessHandler) {
		http
			.authorizeHttpRequests((requests) -> requests
				.requestMatchers("/actuator/health/**").permitAll()
				.anyRequest().authenticated())
			.oauth2Login((login) -> login
				.loginPage("/ledger")
				.authorizationEndpoint((endpoint) -> endpoint.baseUri("/api/oauth2/authorization"))
				.redirectionEndpoint((endpoint) -> endpoint.baseUri("/api/login/oauth2/code/*"))
				.successHandler(loginSuccessHandler))
			.logout((logout) -> logout
				.logoutUrl("/api/logout")
				.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
			.exceptionHandling((exceptions) -> exceptions
				.authenticationEntryPoint((request, response, exception) -> {
					response.setStatus(HttpStatus.UNAUTHORIZED.value());
					response.setContentType(MediaType.APPLICATION_JSON_VALUE);
					response.getWriter().write("{\"error\":\"unauthenticated\"}");
				}))
			.requestCache(RequestCacheConfigurer::disable)
			.csrf((csrf) -> csrf.spa());
		return http.build();
	}

}
