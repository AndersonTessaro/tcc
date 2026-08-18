package br.com.harmonia.lessoncore;

/** RN10: a lesson can have at most one makeup linked to it, and a canceled lesson cannot be repeated. */
public final class MakeupLinkValidator {

    public void validate(SessionStatus originalStatus, boolean alreadyHasMakeup) {
        if (alreadyHasMakeup) {
            throw new InvalidMakeupLinkException("Lesson already has a makeup linked");
        }
        if (originalStatus == SessionStatus.CANCELED) {
            throw new InvalidMakeupLinkException("Cannot create a makeup for a canceled lesson");
        }
    }
}
