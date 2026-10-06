package br.com.harmonia.presentation.response;

import br.com.harmonia.application.lesson.SlotAvailability;
import br.com.harmonia.lessoncore.SessionStatus;

import java.util.List;

public record AvailabilityResponse(SessionStatus initialStatus, boolean available,
                                   List<SlotAvailability.Block> busy, List<SlotAvailability.Block> conflicts,
                                   SlotAvailability.Block fulfilledSchedule) {
    public static AvailabilityResponse of(SlotAvailability availability) {
        return new AvailabilityResponse(availability.initialStatus(), availability.available(),
            availability.busy(), availability.conflicts(), availability.fulfilledSchedule());
    }
}
