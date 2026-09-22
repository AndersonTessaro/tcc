package br.com.harmonia.domain.common;

public class ProfileRequiredException extends RuntimeException {
    public ProfileRequiredException(String profile) {
        super("This action requires a " + profile + " profile");
    }
}
