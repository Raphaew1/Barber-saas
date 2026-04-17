(function () {
  const state = {
    barbershop: null,
    barbers: [],
    services: [],
    slots: [],
    step: 1
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function isClientProductPage() {
    return document.body?.dataset?.appEntry === 'client';
  }

  function isPublicBookingPage() {
    return Boolean(window.currentBarbershopContext) || new URLSearchParams(window.location.search).has('slug');
  }

  function getSelectedServiceCards() {
    return Array.from(document.querySelectorAll('#service-options input[type="checkbox"]:checked'))
      .map((input) => {
        const card = input.closest('.booking-choice-card');
        return {
          id: input.value,
          label: card?.dataset?.name || card?.querySelector('strong')?.textContent || 'Servico',
          price: card?.dataset?.price || '',
          duration: card?.dataset?.duration || ''
        };
      });
  }

  function getSelectedBarberLabel() {
    const select = qs('barber');
    return select?.selectedOptions?.[0]?.textContent || '';
  }

  function getSelectedDateLabel() {
    const value = qs('appointment-date')?.value || '';
    if (!value) {
      return '';
    }
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  }

  function getSelectedSlotLabel() {
    return document.querySelector('.availability-slot.is-active strong')?.textContent || '';
  }

  function renderDayChoices() {
    const container = qs('appointment-day-picker');
    const input = qs('appointment-date');
    if (!container || !input) {
      return;
    }

    const currentValue = input.value;
    const days = Array.from({ length: 8 }, function (_, index) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);
      return date;
    });

    container.innerHTML = days.map((date) => {
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return `
        <button type="button" class="slot-day ${currentValue === value ? 'is-active' : ''}" data-appointment-day="${value}">
          <strong>${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</strong>
          <span>${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-appointment-day]').forEach((button) => {
      button.addEventListener('click', function () {
        input.value = button.dataset.appointmentDay || '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        refreshWizardSummary();
      });
    });
  }

  function computeCurrentStep() {
    const hasServices = getSelectedServiceCards().length > 0;
    const hasBarber = Boolean(qs('barber')?.value);
    const hasDate = Boolean(qs('appointment-date')?.value);
    const hasSlot = Boolean(getSelectedSlotLabel());
    const hasIdentity = Boolean(qs('name')?.value?.trim() && qs('customer-phone')?.value?.trim());

    if (!hasServices) return 1;
    if (!hasBarber) return 2;
    if (!hasDate) return 3;
    if (!hasSlot) return 4;
    if (!hasIdentity) return 5;
    return 6;
  }

  function refreshWizardSummary() {
    const list = qs('booking-summary-list');
    const progress = qs('wizard-progress-fill');
    const selectedServices = getSelectedServiceCards();
    const step = computeCurrentStep();
    state.step = step;

    if (progress) {
      progress.style.width = `${Math.min((step / 6) * 100, 100)}%`;
    }

    if (list) {
      const summaryItems = [
        { label: 'Servicos', value: selectedServices.length ? selectedServices.map((item) => item.label).join(', ') : 'Escolha o atendimento' },
        { label: 'Barbeiro', value: getSelectedBarberLabel() || 'Selecione o profissional' },
        { label: 'Data', value: getSelectedDateLabel() || 'Escolha o dia ideal' },
        { label: 'Horario', value: getSelectedSlotLabel() || 'Selecione um horario livre' },
        { label: 'Contato', value: qs('name')?.value?.trim() || 'Confirme seus dados no final' }
      ];

      list.innerHTML = summaryItems.map((item) => `
        <li>
          <strong>${item.label}</strong>
          <span>${item.value}</span>
        </li>
      `).join('');
    }

    document.querySelectorAll('[data-wizard-step]').forEach((element) => {
      const stepValue = Number(element.dataset.wizardStep || 0);
      element.classList.toggle('is-visible', stepValue === Math.min(step, 5) || stepValue === 6 && step >= 5);
      element.classList.toggle('is-complete', stepValue < step);
    });

    document.querySelectorAll('[data-step-trigger]').forEach((button) => {
      const stepValue = Number(button.dataset.stepTrigger || 0);
      button.classList.toggle('is-active', stepValue === Math.min(step, 5));
      button.disabled = stepValue > step;
    });
  }

  function renderPublicOverview() {
    const nameElement = qs('public-barbershop-name');
    const descriptionElement = qs('public-barbershop-description');
    const servicesContainer = qs('public-services-list');
    const barbersContainer = qs('public-barbers-list');
    const badgeElement = qs('public-barbershop-badge');
    const ctaElements = document.querySelectorAll('[data-scroll-booking]');

    if (!nameElement || !isPublicBookingPage()) {
      return;
    }

    const context = state.barbershop || window.currentBarbershopContext || null;
    if (!context) {
      return;
    }

    document.body.classList.add('public-booking-page');
    nameElement.textContent = context.name || 'Sua proxima visita comeca aqui';
    if (descriptionElement) {
      descriptionElement.textContent = context.email
        ? `Agende em menos de 1 minuto com ${context.name}. Escolha servico, barbeiro e horario sem criar senha antes.`
        : 'Escolha servico, barbeiro e horario em poucos toques.';
    }
    if (badgeElement) {
      badgeElement.textContent = context.slug ? `/barbearia/${context.slug}` : 'Agenda publica';
    }

    if (servicesContainer) {
      servicesContainer.innerHTML = (state.services || []).slice(0, 6).map((service) => `
        <article class="public-card">
          <strong>${service.name}</strong>
          <small>${service.duration_minutes || 30} min${service.price != null ? ` · ${window.formatCurrency ? window.formatCurrency(service.price) : service.price}` : ''}</small>
        </article>
      `).join('') || '<div class="public-card"><strong>Catalogo em configuracao</strong><small>Adicione servicos na barbearia para publicar a agenda.</small></div>';
    }

    if (barbersContainer) {
      barbersContainer.innerHTML = (state.barbers || []).slice(0, 6).map((barber) => `
        <article class="public-card">
          <strong>${barber.name}</strong>
          <small>Profissional disponivel para agendamento online.</small>
        </article>
      `).join('') || '<div class="public-card"><strong>Equipe em configuracao</strong><small>Cadastre barbeiros para liberar a agenda publica.</small></div>';
    }

    ctaElements.forEach((button) => {
      button.addEventListener('click', function () {
        qs('public-booking-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function upgradeServiceCards() {
    const options = qs('service-options');
    if (!options) {
      return;
    }

    options.querySelectorAll('label.service-option').forEach((label) => {
      const input = label.querySelector('input');
      if (!input || label.dataset.enhanced === 'true') {
        return;
      }

      const rawText = label.querySelector('span')?.textContent || '';
      const [namePart, pricePart = '', durationPart = ''] = rawText.split('·').map((item) => item.trim());
      label.className = 'booking-choice-card service-option';
      label.dataset.enhanced = 'true';
      label.dataset.name = namePart;
      label.dataset.price = pricePart;
      label.dataset.duration = durationPart;
      label.innerHTML = `
        <input type="checkbox" value="${input.value}" data-price="${input.dataset.price || ''}" data-duration="${input.dataset.duration || ''}" onchange="handleServiceSelectionChange()">
        <strong>${namePart}</strong>
        <small>${pricePart || 'Valor sob consulta'}${durationPart ? ` · ${durationPart}` : ''}</small>
      `;
    });
  }

  function renderBarberCards() {
    const select = qs('barber');
    const container = qs('barber-card-list');
    if (!select || !container) {
      return;
    }

    const options = Array.from(select.options).filter((option) => option.value);
    container.innerHTML = options.map((option) => `
      <button type="button" class="booking-choice-card ${select.value === option.value ? 'is-selected' : ''}" data-barber-card="${option.value}">
        <strong>${option.textContent}</strong>
        <small>Disponivel para confirmar horarios online.</small>
      </button>
    `).join('') || '<div class="public-card"><strong>Sem barbeiros publicados</strong><small>Cadastre a equipe para liberar o agendamento.</small></div>';

    container.querySelectorAll('[data-barber-card]').forEach((button) => {
      button.addEventListener('click', function () {
        select.value = button.dataset.barberCard || '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        container.querySelectorAll('[data-barber-card]').forEach((item) => item.classList.remove('is-selected'));
        button.classList.add('is-selected');
        refreshWizardSummary();
      });
    });
  }

  function mountWizardInteractions() {
    ['name', 'customer-phone', 'customer-email', 'appointment-date', 'appointment-payment-provider', 'barber'].forEach((id) => {
      const element = qs(id);
      if (!element || element.dataset.productBound === 'true') {
        return;
      }
      element.addEventListener('input', refreshWizardSummary);
      element.addEventListener('change', refreshWizardSummary);
      element.dataset.productBound = 'true';
    });

    renderDayChoices();

    document.querySelectorAll('[data-step-trigger]').forEach((button) => {
      button.addEventListener('click', function () {
        const step = Number(button.dataset.stepTrigger || 1);
        document.querySelectorAll('[data-wizard-step]').forEach((panel) => {
          const panelStep = Number(panel.dataset.wizardStep || 0);
          panel.classList.toggle('is-visible', panelStep === step);
        });
        document.querySelectorAll('[data-step-trigger]').forEach((item) => item.classList.toggle('is-active', item === button));
      });
    });
  }

  function renderPlanUsageBanner(detail) {
    const banner = qs('inline-paywall-banner');
    if (!banner || !detail) {
      return;
    }

    const appointmentsRatio = detail.plan?.maxAppointmentsPerMonth
      ? (detail.appointmentsCount / detail.plan.maxAppointmentsPerMonth)
      : 0;
    const barbersRatio = detail.plan?.maxBarbers
      ? (detail.barbersCount / detail.plan.maxBarbers)
      : 0;
    const isNearLimit = appointmentsRatio >= 0.8 || barbersRatio >= 0.8;

    banner.classList.toggle('is-visible', isNearLimit);
    if (isNearLimit) {
      banner.innerHTML = `
        <strong>Seu plano ${detail.plan?.label || 'atual'} esta chegando ao limite</strong>
        <p>${detail.appointmentsCount || 0}/${detail.plan?.maxAppointmentsPerMonth || '-'} agendamentos no mes e ${detail.barbersCount || 0}/${detail.plan?.maxBarbers || '-'} barbeiros ativos.</p>
        <button type="button" class="public-cta">Fazer upgrade</button>
      `;

      const button = banner.querySelector('button');
      button?.addEventListener('click', function () {
        if (window.showUpgradePrompt) {
          window.showUpgradePrompt({
            usage: detail,
            message: 'Desbloqueie mais barbeiros, mais agendamentos e recursos premium para continuar crescendo.'
          });
        }
      });
    }
  }

  function initClientProductExperience() {
    if (!isClientProductPage()) {
      return;
    }

    mountWizardInteractions();
    upgradeServiceCards();
    renderBarberCards();
    renderDayChoices();
    refreshWizardSummary();
    renderPublicOverview();

    const appointmentButton = document.querySelector('[data-booking-submit]');
    appointmentButton?.addEventListener('click', refreshWizardSummary);
  }

  document.addEventListener('DOMContentLoaded', initClientProductExperience);

  window.addEventListener('public:barbershop-data', function (event) {
    state.barbershop = event.detail?.context || state.barbershop;
    state.barbers = event.detail?.barbers || [];
    state.services = event.detail?.services || [];
    initClientProductExperience();
  });

  window.addEventListener('appointment:services-loaded', function () {
    upgradeServiceCards();
    refreshWizardSummary();
  });

  window.addEventListener('appointment:barbers-loaded', function () {
    renderBarberCards();
    refreshWizardSummary();
  });

  window.addEventListener('appointment:slots-updated', function (event) {
    state.slots = event.detail?.slots || [];
    refreshWizardSummary();
  });

  window.addEventListener('appointment:created', function () {
    window.setTimeout(refreshWizardSummary, 120);
  });

  window.addEventListener('plan:usage-updated', function (event) {
    renderPlanUsageBanner(event.detail);
  });
}());
