package br.com.harmonia.lessoncore;

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
