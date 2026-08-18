package br.com.harmonia.infrastructure.event;

import br.com.harmonia.lessoncore.DomainEventPublisher;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** Adapts lesson-core's {@link DomainEventPublisher} port to Spring's event bus. */
@Component
public class SpringDomainEventPublisher implements DomainEventPublisher {
    private final ApplicationEventPublisher delegate;

    public SpringDomainEventPublisher(ApplicationEventPublisher delegate) {
        this.delegate = delegate;
    }

    @Override
    public void publish(Object event) {
        delegate.publishEvent(event);
    }
}
