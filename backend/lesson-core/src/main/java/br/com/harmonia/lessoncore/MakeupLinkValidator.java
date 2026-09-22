package br.com.harmonia.lessoncore;

import java.util.EnumSet;

public final class MakeupLinkValidator {
    private static final EnumSet<SessionStatus> REPLACEABLE = EnumSet.of(SessionStatus.DONE, SessionStatus.CANCELED);

    public void validate(SessionStatus originalStatus, boolean alreadyHasMakeup) {
        if (alreadyHasMakeup) {
            throw new InvalidMakeupLinkException("Lesson already has a makeup linked");
        }
        if (!REPLACEABLE.contains(originalStatus)) {
            throw new InvalidMakeupLinkException("Only a completed or canceled lesson can receive a makeup");
        }
    }
}
