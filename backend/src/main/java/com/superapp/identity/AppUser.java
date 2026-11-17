package com.superapp.identity;

import java.util.UUID;

public record AppUser(UUID id, String email, String displayName, String pictureUrl) {

}
