package br.com.harmonia.lessoncore;

/** RN10: only a completed lesson can originate one makeup lesson. */
public final class MakeupLinkValidator {

    public void validate(SessionStatus originalStatus, boolean alreadyHasMakeup) {
        if (alreadyHasMakeup) {
            throw new InvalidMakeupLinkException("Lesson already has a makeup linked");
        }
        if (originalStatus != SessionStatus.DONE) {
            throw new InvalidMakeupLinkException("Only a completed lesson can receive a makeup");
        }
    }
}
