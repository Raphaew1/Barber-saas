// Inicializacao do client Supabase usado em toda a aplicacao.
const supabaseLib = window.supabase

if (!supabaseLib) {
  alert('Supabase nao carregou')
  throw new Error('Supabase nao encontrado')
}

const supabaseClient = supabaseLib.createClient(
  'https://kgpsfbuurggwmpcxrfpa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtncHNmYnV1cmdnd21wY3hyZnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzkxMDUsImV4cCI6MjA4OTM1NTEwNX0.FumQWyi14AOWPPRJZjQx3PUpfVh2Hj1TLTTKVDf8FVQ'
)

let authUiInitialized = false
let currentSession = null
let currentBarbershopId = null
let currentPortal = null
let managementProductsCache = []
let purchaseModalProductId = null
let appointmentIdentitySupport = null
let appointmentWorkflowSupport = null
const ADMIN_EMAIL = 'raphacom.web@gmail.com'
const THEME_STORAGE_KEY = 'barber-saas-theme'
const PORTAL_STORAGE_KEY = 'barber-saas-portal'

// Captura erros globais do navegador para facilitar o diagnostico.
window.addEventListener('error', (e) => {
  console.error('Unhandled JS error:', e.message, e.filename, e.lineno)
  alert(`Erro JS: ${e.message}`)
})

// Captura promises rejeitadas que nao tiveram tratamento explicito.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
  alert(`Erro nao tratado: ${e.reason}`)
})

// Processo de login do usuario e carregamento inicial da tela.
window.login = async function () {
  console.log('login called')
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  if (!currentPortal) {
    alert('Selecione se o acesso sera como cliente ou barbeiro.')
    return
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    console.log('login response', data, error)

    if (error) {
      alert(error.message)
      return
    }

    if (currentPortal === 'barbeiro') {
      const accessResult = await validateBarberPortalAccess(data.user || data.session?.user)

      if (!accessResult.allowed) {
        await supabaseClient.auth.signOut()
        currentSession = null
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        alert(accessResult.message)
        return
      }
    }

    currentSession = data.session
    alert('Login OK')
    updateProtectedUi(true)
    applyPortalUi()
    showScreen(getDefaultScreenForPortal())
    await carregarPortalData(getDefaultScreenForPortal())
  } catch (err) {
    console.error('login error', err)
    alert('Erro no login (ver console)')
  }
}

// Processo de criacao de conta, barbearia padrao e perfil do usuario.
window.signup = async function () {
  console.log('signup called')
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  if (currentPortal !== 'barbeiro') {
    alert('Criacao de conta disponivel apenas para o portal do barbeiro.')
    return
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password
    })

    console.log('signup response', data, error)

    if (error) {
      alert(error.message)
      return
    }

    const user = data.user

    if (!user) {
      alert('Desative a confirmacao de email no Supabase.')
      return
    }

    if (email !== ADMIN_EMAIL) {
      if (data.session) {
        await supabaseClient.auth.signOut()
      }

      alert('Conta criada. Aguarde a liberacao manual do admin para acessar o portal do barbeiro.')
      return
    }

    const { data: shop, error: shopError } = await supabaseClient
      .from('barbershops')
      .insert([{ name: 'Minha Barbearia' }])
      .select()
      .single()

    if (shopError) {
      alert('Erro ao criar barbearia')
      return
    }

    const { error: profileError } = await supabaseClient.from('profiles').insert([
      {
        id: user.id,
        email: user.email,
        barbershop_id: shop.id
      }
    ])

    if (profileError) {
      alert(profileError.message)
      return
    }

    // Cria dados basicos para que os selects funcionem na primeira utilizacao.
    await criarDadosIniciaisDaBarbearia(shop.id)

    if (data.session) {
      currentSession = data.session
      currentBarbershopId = shop.id
      updateProtectedUi(true)
      applyPortalUi()
      alert('Conta criada e login realizado com sucesso!')
      showScreen(getDefaultScreenForPortal())
      await carregarPortalData(getDefaultScreenForPortal())
      return
    }

    alert('Conta criada! Agora faca login.')
  } catch (err) {
    console.error('signup error', err)
    alert('Erro no cadastro (ver console)')
  }
}


// Cria registros basicos de barbeiro e servico para uma nova barbearia.
async function criarDadosIniciaisDaBarbearia(barbershopId) {
  const defaultBarbers = getDefaultBarbers(barbershopId)
  const defaultServices = getDefaultServices(barbershopId)

  const { data: existingBarbers, error: existingBarbersError } = await supabaseClient
    .from('barbers')
    .select('id')
    .eq('barbershop_id', barbershopId)
    .limit(1)

  if (existingBarbersError) {
    throw new Error(`Nao foi possivel verificar os barbeiros: ${existingBarbersError.message}`)
  }

  if (!existingBarbers || existingBarbers.length === 0) {
    const { error: barberError } = await supabaseClient
      .from('barbers')
      .insert(defaultBarbers)

    if (barberError) {
      throw new Error(`Nao foi possivel criar os barbeiros de teste: ${barberError.message}`)
    }
  }

  const { data: existingServices, error: existingServicesError } = await supabaseClient
    .from('services')
    .select('id')
    .eq('barbershop_id', barbershopId)
    .limit(1)

  if (existingServicesError) {
    throw new Error(`Nao foi possivel verificar os servicos: ${existingServicesError.message}`)
  }

  if (!existingServices || existingServices.length === 0) {
    const { error: serviceError } = await supabaseClient
      .from('services')
      .insert(defaultServices)

    if (serviceError) {
      throw new Error(`Nao foi possivel criar os servicos de teste: ${serviceError.message}`)
    }
  }
}
// Processo principal de criacao do agendamento.
window.agendar = async function () {
  const name = document.getElementById('name').value.trim()
  const time = document.getElementById('time').value
  const barberId = document.getElementById('barber').value
  const serviceIds = getSelectedServiceIds()

  if (!name) {
    alert('Informe o nome do cliente.')
    return
  }

  if (!time) {
    alert('Selecione uma data e horario para o agendamento.')
    return
  }

  if (!barberId || serviceIds.length === 0) {
    alert('Selecione barbeiro e pelo menos um servico antes de agendar.')
    return
  }

  const normalizedTime = normalizeAppointmentTime(time)
  if (!normalizedTime) {
    alert('Data invalida. Escolha outra data e tente novamente.')
    return
  }

  const barbershopId = await resolveAppointmentBarbershop(barberId, serviceIds)
  if (!barbershopId) {
    alert('Nao foi possivel identificar a barbearia do agendamento.')
    return
  }

  const { data: existing, error: existingError } = await supabaseClient
    .from('appointments')
    .select('*')
    .eq('barber_id', barberId)
    .eq('appointment_time', normalizedTime)

  if (existingError) {
    console.error('Erro ao validar horario', existingError)
    alert(existingError.message)
    return
  }

  if (existing && existing.length > 0) {
    alert('Horario ja ocupado!')
    return
  }

  const currentUser = await getCurrentUser()
  const appointmentsPayload = serviceIds.map((serviceId) => ({
    customer_name: name,
    barber_id: barberId,
    service_id: serviceId,
    appointment_time: normalizedTime,
    barbershop_id: barbershopId,
    customer_user_id: currentUser?.id,
    customer_email: currentUser?.email || null,
    status: 'scheduled',
    finalized_at: null
  }))

  let insertResult = await supabaseClient
    .from('appointments')
    .insert(appointmentsPayload)
    .select('id, service_id, barber_id, customer_name, appointment_time')

  if (
    insertResult.error &&
    isMissingAppointmentIdentityColumnsError(insertResult.error) &&
    isMissingAppointmentWorkflowColumnsError(insertResult.error)
  ) {
    appointmentIdentitySupport = false
    appointmentWorkflowSupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: normalizedTime,
      barbershop_id: barbershopId
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (insertResult.error && isMissingAppointmentIdentityColumnsError(insertResult.error)) {
    appointmentIdentitySupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: normalizedTime,
      barbershop_id: barbershopId,
      status: 'scheduled',
      finalized_at: null
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (insertResult.error && isMissingAppointmentWorkflowColumnsError(insertResult.error)) {
    appointmentWorkflowSupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: normalizedTime,
      barbershop_id: barbershopId,
      customer_user_id: currentUser?.id,
      customer_email: currentUser?.email || null
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (!insertResult.error) {
    appointmentIdentitySupport = true
    appointmentWorkflowSupport = true
  }

  const { error } = insertResult

  if (error) {
    console.error('Erro ao agendar', error)
    alert(error.message)
    return
  }

  showSuccess()
  resetAppointmentForm()
  await sincronizarAgendamentos()
}

// Exibe um aviso visual curto apos agendar com sucesso.
function showSuccess() {
  const msg = document.createElement('div')
  msg.innerText = 'Agendado com sucesso!'
  msg.className = 'toast-success'

  document.body.appendChild(msg)
  setTimeout(() => msg.remove(), 3000)
}

// Normaliza a data local para o formato ISO esperado no banco.
function normalizeAppointmentTime(time) {
  const parsedDate = new Date(time)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

// Limpa o formulario apos o agendamento.
function resetAppointmentForm() {
  document.getElementById('name').value = ''
  document.getElementById('time').value = ''
  document.getElementById('barber').value = ''
  clearSelectedServices()
  updateServiceTriggerLabel()
  updateMinDateTime()
}

// Carrega barbeiros e servicos disponiveis para os selects da tela.
async function carregarDados() {
  const barbershopId = currentPortal === 'barbeiro' ? await getBarbershop() : null
  if (currentPortal === 'barbeiro' && !barbershopId) {
    renderSelectState('barber', 'Nenhum barbeiro disponivel', true)
    renderServiceState('Nenhum servico disponivel')
    return
  }

  renderSelectState('barber', 'Carregando barbeiros...', true)
  renderServiceState('Carregando servicos...')

  let barbersQuery = supabaseClient
    .from('barbers')
    .select('id, name, barbershop_id')
    .order('name', { ascending: true })

  let servicesQuery = supabaseClient
    .from('services')
    .select('id, name, barbershop_id')
    .order('name', { ascending: true })

  if (barbershopId) {
    barbersQuery = barbersQuery.eq('barbershop_id', barbershopId)
    servicesQuery = servicesQuery.eq('barbershop_id', barbershopId)
  }

  const { data: barbers, error: barbersError } = await barbersQuery
  const { data: services, error: servicesError } = await servicesQuery

  if (barbershopId && !barbersError && !servicesError && (barbers?.length === 0 || services?.length === 0)) {
    try {
      await criarDadosIniciaisDaBarbearia(barbershopId)
      return carregarDados()
    } catch (seedError) {
      console.error('Erro ao criar dados iniciais', seedError)
      alert(seedError.message)
    }
  }

  if (barbersError) {
    console.error('Erro ao carregar barbeiros', barbersError)
    renderSelectState('barber', 'Erro ao carregar barbeiros', true)
  } else {
    populateSelect('barber', barbers, 'Selecione um barbeiro')
  }

  if (servicesError) {
    console.error('Erro ao carregar servicos', servicesError)
    renderServiceState('Erro ao carregar servicos')
  } else {
    renderServiceOptions(services)
  }

  updateMinDateTime()
}

// Monta a listagem de agendamentos salvos.
window.carregarAgenda = async function () {
  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderHistoryMessage('lista', 'Faca login para visualizar a agenda da barbearia.')
    return
  }

  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      customer_name,
      appointment_time,
      status,
      finalized_at,
      barbers (
        name
      ),
      services (
        name,
        description,
        price
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('appointment_time', { ascending: true })

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        customer_name,
        appointment_time,
        barbers (
          name
        ),
        services (
          name,
          description,
          price
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('appointment_time', { ascending: true })
  } else if (!query.error) {
    appointmentWorkflowSupport = true
  }

  const { data, error } = query

  if (error) {
    console.error('Erro ao carregar agenda', error)
    alert('Erro ao carregar agenda: ' + error.message)
    return
  }

  const lista = document.getElementById('lista')
  renderAppointmentCards('lista', data || [], 'Nenhum agendamento encontrado.')
}

// Mantem as listas de agendamento atualizadas entre o portal do cliente e o do barbeiro.
async function sincronizarAgendamentos() {
  const tasks = []

  if (document.getElementById('lista')) {
    tasks.push(carregarAgenda())
  }

  if (document.getElementById('client-history-list')) {
    tasks.push(carregarHistoricoCliente())
  }

  await Promise.all(tasks)
}

// Carrega o historico de agendamentos vinculado ao cliente logado.
window.carregarHistoricoCliente = async function () {
  const historyContainerId = 'client-history-list'
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    renderHistoryMessage(historyContainerId, 'Faca login para consultar seu historico de agendamentos.')
    return
  }

  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      customer_name,
      appointment_time,
      status,
      finalized_at,
      customer_email,
      customer_user_id,
      barbers (
        name
      ),
      services (
        name,
        description,
        price
      )
    `)
    .or([
      `customer_user_id.eq.${currentUser.id}`,
      currentUser.email ? `customer_email.eq.${escapeSupabaseFilterValue(currentUser.email)}` : null
    ].filter(Boolean).join(','))
    .order('appointment_time', { ascending: false })

  if (query.error && isMissingAppointmentIdentityColumnsError(query.error)) {
    appointmentIdentitySupport = false
    renderHistoryMessage(
      historyContainerId,
      'Adicione customer_user_id e customer_email na tabela appointments para liberar o historico do cliente logado.'
    )
    return
  }

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        customer_name,
        appointment_time,
        customer_email,
        customer_user_id,
        barbers (
          name
        ),
        services (
          name,
          description,
          price
        )
      `)
      .or([
        `customer_user_id.eq.${currentUser.id}`,
        currentUser.email ? `customer_email.eq.${escapeSupabaseFilterValue(currentUser.email)}` : null
      ].filter(Boolean).join(','))
      .order('appointment_time', { ascending: false })
  }

  if (query.error) {
    renderHistoryMessage(historyContainerId, `Erro ao carregar historico: ${query.error.message}`)
    return
  }

  appointmentIdentitySupport = true
  appointmentWorkflowSupport = true
  renderAppointmentCards(historyContainerId, deduplicateAppointments(query.data || []), 'Nenhum agendamento encontrado para sua conta.')
}

// Carrega os dados administrativos da tela de cadastros.
window.carregarCadastros = async function () {
  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderAdminMessage('barbers-admin-list', 'Faca login para gerenciar barbeiros.')
    renderAdminMessage('services-admin-list', 'Faca login para gerenciar servicos.')
    renderAdminMessage('products-admin-list', 'Faca login para gerenciar produtos.')
    return
  }

  await Promise.all([
    carregarBarbeirosAdmin(barbershopId),
    carregarServicosAdmin(barbershopId),
    carregarProdutosAdmin(barbershopId)
  ])
}

// Carrega a vitrine de produtos exibida no portal do cliente.
window.carregarProdutos = async function () {
  const barbershopId = currentPortal === 'barbeiro' ? await getBarbershop() : null
  if (currentPortal === 'barbeiro' && !barbershopId) {
    renderCatalogMessage('Faca login para visualizar os produtos da barbearia.')
    return
  }

  const productsResult = await fetchManagementProducts(barbershopId)
  managementProductsCache = productsResult.items

  if (productsResult.errorMessage && productsResult.items.length === 0) {
    renderCatalogMessage(productsResult.errorMessage)
    return
  }

  renderProductsCatalog(productsResult.items || [], productsResult.stockSupported)
}

// Carrega a pagina de gestao com indicadores financeiros e operacionais.
window.carregarGestao = async function () {
  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderManagementMessage('management-summary', 'Faca login para visualizar a gestao.')
    renderManagementMessage('stock-list', 'Faca login para visualizar o estoque.')
    renderManagementMessage('sales-list', 'Faca login para visualizar as vendas.')
    renderManagementMessage('services-revenue-list', 'Faca login para visualizar os servicos.')
    renderManagementMessage('barber-revenue-list', 'Faca login para visualizar o faturamento por barbeiro.')
    renderAccessManagementMessage('Faca login como admin para gerenciar os acessos do portal barbeiro.')
    populateSaleProducts([])
    return
  }

  const productsResult = await fetchManagementProducts(barbershopId)
  managementProductsCache = productsResult.items
  populateSaleProducts(productsResult.items)
  renderStockList(productsResult.items, productsResult.stockSupported, productsResult.errorMessage)

  const [appointmentsResult, serviceSalesResult, productSalesResult] = await Promise.all([
    fetchAppointmentsWithRelations(barbershopId),
    fetchServiceSales(barbershopId),
    fetchProductSales(barbershopId)
  ])

  renderManagementSummary(serviceSalesResult, appointmentsResult, productSalesResult)
  renderServiceRevenue(serviceSalesResult, appointmentsResult)
  renderBarberRevenue(serviceSalesResult, appointmentsResult)
  renderProductSales(productSalesResult)
}

// Remove um agendamento da agenda.
window.deletarAgendamento = async function (id) {
  if (!confirm('Tem certeza que deseja apagar este agendamento?')) {
    return
  }

  const { error: serviceSalesError } = await supabaseClient
    .from('service_sales')
    .delete()
    .eq('appointment_id', id)

  if (serviceSalesError) {
    console.error('Erro ao apagar service_sales do agendamento', serviceSalesError)
    alert('Erro ao apagar servicos realizados: ' + serviceSalesError.message)
    return
  }

  const { error } = await supabaseClient
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao apagar agendamento', error)
    alert('Erro ao apagar agendamento: ' + error.message)
    return
  }

  alert('Agendamento apagado com sucesso.')
  await sincronizarAgendamentos()
  await carregarGestao()
}

// Finaliza um agendamento do barbeiro e libera a visualizacao no historico do cliente.
window.finalizarAgendamento = async function (id) {
  if (!confirm('Marcar este agendamento como finalizado?')) {
    return
  }

  const { data: appointment, error: appointmentError } = await supabaseClient
    .from('appointments')
    .select('id, customer_name, barber_id, service_id, appointment_time, barbershop_id, status')
    .eq('id', id)
    .single()

  if (appointmentError) {
    alert(`Erro ao consultar agendamento: ${appointmentError.message}`)
    return
  }

  if (appointment?.status === 'finalized') {
    alert('Este agendamento ja esta finalizado.')
    return
  }

  const finalizedAt = new Date().toISOString()
  const updatePayload = {
    status: 'finalized',
    finalized_at: finalizedAt
  }

  const { error: finalizeError } = await supabaseClient
    .from('appointments')
    .update(updatePayload)
    .eq('id', id)

  if (finalizeError && isMissingAppointmentWorkflowColumnsError(finalizeError)) {
    appointmentWorkflowSupport = false
    alert('Adicione as colunas status e finalized_at na tabela appointments para habilitar a finalizacao.')
    return
  }

  if (finalizeError) {
    alert(`Erro ao finalizar agendamento: ${finalizeError.message}`)
    return
  }

  appointmentWorkflowSupport = true

  const { data: existingSale, error: existingSaleError } = await supabaseClient
    .from('service_sales')
    .select('id')
    .eq('appointment_id', id)
    .maybeSingle()

  if (existingSaleError) {
    console.error('Erro ao validar service_sales do agendamento', existingSaleError)
  }

  if (!existingSale) {
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('price')
      .eq('id', appointment.service_id)
      .maybeSingle()

    if (serviceError) {
      alert(`Agendamento finalizado, mas nao foi possivel consultar o servico: ${serviceError.message}`)
    } else {
      const { error: serviceSalesError } = await supabaseClient
        .from('service_sales')
        .insert([
          {
            appointment_id: appointment.id,
            barber_id: appointment.barber_id,
            service_id: appointment.service_id,
            barbershop_id: appointment.barbershop_id,
            customer_name: appointment.customer_name,
            service_price: Number(service?.price || 0),
            performed_at: appointment.appointment_time
          }
        ])

      if (serviceSalesError) {
        console.error('Erro ao registrar service_sales na finalizacao', serviceSalesError)
        alert(`Agendamento finalizado, mas nao foi possivel registrar o servico realizado: ${serviceSalesError.message}`)
      }
    }
  }

  await sincronizarAgendamentos()
  await carregarGestao()
}

// Alterna entre as telas do app conforme o menu lateral.
window.mostrarTela = async function (tela) {
  const isLoggedIn = await hasActiveSession()

  if (!isLoggedIn && tela !== 'login') {
    alert('Faca login para acessar essa area.')
    showScreen('login')
    return
  }

  if (!isScreenAllowedForPortal(tela)) {
    alert('Essa area nao esta disponivel no portal selecionado.')
    showScreen(getDefaultScreenForPortal())
    await carregarPortalData(getDefaultScreenForPortal())
    return
  }

  showScreen(tela)
  await carregarPortalData(tela)
}

// Encerra a sessao do usuario e volta para a tela inicial.
window.logout = async function () {
  try {
    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      alert('Erro ao sair: ' + error.message)
      return
    }

    alert('Voce saiu com sucesso.')
    currentSession = null
    currentBarbershopId = null
    currentPortal = null
    localStorage.removeItem(PORTAL_STORAGE_KEY)
    updateProtectedUi(false)
    applyPortalUi()
    showScreen('login')
  } catch (err) {
    console.error('logout error', err)
    alert('Erro ao sair (ver console)')
  }
}

// Descobre a barbearia vinculada ao usuario autenticado.
async function getBarbershop() {
  if (currentBarbershopId) {
    return currentBarbershopId
  }

  const {
    data: { user },
    error: authError
  } = await supabaseClient.auth.getUser()

  if (authError) {
    console.error('getUser error', authError)
    return null
  }

  if (!user) return null

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getBarbershop error', error)
    return null
  }

  currentBarbershopId = data?.barbershop_id ?? null

  return currentBarbershopId
}

// Resolve a barbearia do agendamento a partir do barbeiro e dos servicos escolhidos.
async function resolveAppointmentBarbershop(barberId, serviceIds) {
  const sessionBarbershopId = await getBarbershop()
  if (sessionBarbershopId) {
    return sessionBarbershopId
  }

  const [{ data: barber, error: barberError }, { data: services, error: servicesError }] = await Promise.all([
    supabaseClient
      .from('barbers')
      .select('barbershop_id')
      .eq('id', barberId)
      .maybeSingle(),
    supabaseClient
      .from('services')
      .select('id, barbershop_id')
      .in('id', serviceIds)
  ])

  if (barberError || servicesError) {
    console.error('Erro ao resolver a barbearia do agendamento', barberError || servicesError)
    return null
  }

  const serviceBarbershopIds = new Set((services || []).map((item) => item.barbershop_id).filter(Boolean))

  if (!barber?.barbershop_id) {
    return null
  }

  if (serviceBarbershopIds.size === 0) {
    return barber.barbershop_id
  }

  if (serviceBarbershopIds.size > 1 || !serviceBarbershopIds.has(barber.barbershop_id)) {
    alert('Selecione barbeiro e servicos da mesma barbearia.')
    return null
  }

  return barber.barbershop_id
}

// Retorna o usuario autenticado atual para vincular dados ao cliente logado.
async function getCurrentUser() {
  if (currentSession?.user) {
    return currentSession.user
  }

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser()

  if (error) {
    console.error('Erro ao obter usuario atual', error)
    return null
  }

  return user ?? null
}

// Indica se um email corresponde ao administrador principal.
function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL
}

// Valida se um usuario pode acessar o portal do barbeiro e sincroniza o perfil quando aprovado.
async function validateBarberPortalAccess(user) {
  if (!user?.email) {
    return {
      allowed: false,
      message: 'Nao foi possivel validar o email deste usuario.'
    }
  }

  if (isAdminEmail(user.email)) {
    return { allowed: true }
  }

  const { data, error } = await supabaseClient
    .from('barber_access')
    .select('email, barbershop_id, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return {
      allowed: false,
      message: `Nao foi possivel validar o acesso ao portal do barbeiro: ${error.message}`
    }
  }

  if (!data?.barbershop_id) {
    return {
      allowed: false,
      message: 'Seu email ainda nao foi liberado pelo administrador para acessar o portal do barbeiro.'
    }
  }

  const { error: profileError } = await supabaseClient
    .from('profiles')
    .upsert(
      [
        {
          id: user.id,
          email: user.email,
          barbershop_id: data.barbershop_id
        }
      ],
      { onConflict: 'id' }
    )

  if (profileError) {
    return {
      allowed: false,
      message: `Seu acesso foi encontrado, mas nao foi possivel sincronizar o perfil: ${profileError.message}`
    }
  }

  currentBarbershopId = data.barbershop_id

  return { allowed: true }
}

// Faz a inicializacao da pagina ao abrir a aplicacao.
async function init() {
  applySavedTheme()
  restorePortalSelection()

  const emailInput = document.getElementById('email')
  if (emailInput && !emailInput.dataset.boundPortalAccess) {
    emailInput.addEventListener('input', () => {
      updateLoginPortalUi()
    })
    emailInput.dataset.boundPortalAccess = 'true'
  }

  const { data, error } = await supabaseClient.auth.getSession()

  if (error) {
    console.error('Erro ao carregar sessao', error)
    return
  }

  console.log('SESSION:', data)
  currentSession = data.session ?? null

  if (data.session) {
    if (!currentPortal) {
      setPortal('barbeiro')
    }

    if (currentPortal === 'barbeiro') {
      const accessResult = await validateBarberPortalAccess(data.session.user)

      if (!accessResult.allowed) {
        await supabaseClient.auth.signOut()
        currentSession = null
        currentBarbershopId = null
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        alert(accessResult.message)
        return
      }
    }

    updateProtectedUi(true)
    applyPortalUi()
    showScreen(getDefaultScreenForPortal())
    await carregarPortalData(getDefaultScreenForPortal())
  } else {
    updateProtectedUi(false)
    applyPortalUi()
    showScreen('login')
    console.log('Usuario nao logado')
    renderSelectState('barber', 'Faca login para carregar', true)
    renderServiceState('Faca login para carregar')
    renderAdminMessage('barbers-admin-list', 'Faca login para gerenciar barbeiros.')
    renderAdminMessage('services-admin-list', 'Faca login para gerenciar servicos.')
    renderAdminMessage('products-admin-list', 'Faca login para gerenciar produtos.')
    renderCatalogMessage('Selecione um portal e faca login para visualizar os produtos.')
  }

  if (!authUiInitialized) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentSession = session ?? null
      if (!session) {
        currentBarbershopId = null
      }
      updateProtectedUi(Boolean(session))
      applyPortalUi()
    })
    authUiInitialized = true
  }
}

// Define a menor data/hora permitida no input de agendamento.
function updateMinDateTime() {
  const timeInput = document.getElementById('time')

  if (!timeInput) {
    return
  }

  timeInput.min = getCurrentLocalDateTime()
}

// Retorna os servicos marcados no bloco de selecao.
function getSelectedServiceIds() {
  return Array.from(document.querySelectorAll('#service-options input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter(Boolean)
}

// Limpa os servicos marcados no formulario de agendamento.
function clearSelectedServices() {
  document.querySelectorAll('#service-options input[type="checkbox"]').forEach((input) => {
    input.checked = false
  })
}

// Mostra um estado simples na area de servicos.
function renderServiceState(message) {
  const container = document.getElementById('service-options')

  if (!container) {
    return
  }

  container.innerHTML = `<div class="service-empty">${message}</div>`
  updateServiceTriggerLabel(message)
}

// Renderiza os servicos como opcoes clicaveis.
function renderServiceOptions(items) {
  const container = document.getElementById('service-options')

  if (!container) {
    return
  }

  const validItems = Array.isArray(items)
    ? items.filter((item) => item?.id && item?.name)
    : []

  if (validItems.length === 0) {
    renderServiceState('Nenhum servico disponivel')
    return
  }

  container.innerHTML = validItems
    .map((item) => {
      return `
        <label class="service-option">
          <input type="checkbox" value="${item.id}" onchange="updateServiceTriggerLabel()">
          <span>${item.name}</span>
        </label>
      `
    })
    .join('')

  updateServiceTriggerLabel()
}

// Gera a data local atual no formato aceito pelo datetime-local.
function getCurrentLocalDateTime() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60000

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

// Cadastra um novo barbeiro na barbearia do usuario.
window.cadastrarBarbeiro = async function () {
  const nameInput = document.getElementById('new-barber-name')
  const name = nameInput.value.trim()

  if (!name) {
    alert('Informe o nome do barbeiro.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert('Usuario nao logado')
    return
  }

  const { error } = await supabaseClient
    .from('barbers')
    .insert([{ name, barbershop_id: barbershopId }])

  if (error) {
    alert(`Erro ao cadastrar barbeiro: ${error.message}`)
    return
  }

  nameInput.value = ''
  await carregarDados()
  await carregarBarbeirosAdmin(barbershopId)
}

// Cadastra um novo servico na barbearia do usuario.
window.cadastrarServico = async function () {
  const nameInput = document.getElementById('new-service-name')
  const descriptionInput = document.getElementById('new-service-description')
  const priceInput = document.getElementById('new-service-price')
  const name = nameInput.value.trim()
  const description = descriptionInput.value.trim()
  const price = priceInput.value.trim()

  if (!name) {
    alert('Informe o nome do servico.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert('Usuario nao logado')
    return
  }

  const payload = { name, barbershop_id: barbershopId }

  if (description) {
    payload.description = description
  }

  if (price) {
    payload.price = Number(price)
  }

  const { error } = await supabaseClient
    .from('services')
    .insert([payload])

  if (error) {
    alert(`Erro ao cadastrar servico: ${error.message}`)
    return
  }

  nameInput.value = ''
  descriptionInput.value = ''
  priceInput.value = ''
  await carregarDados()
  await carregarServicosAdmin(barbershopId)
}

// Cadastra um novo produto para a barbearia.
window.cadastrarProduto = async function () {
  const nameInput = document.getElementById('new-product-name')
  const descriptionInput = document.getElementById('new-product-description')
  const priceInput = document.getElementById('new-product-price')
  const name = nameInput.value.trim()
  const description = descriptionInput.value.trim()
  const price = priceInput.value.trim()

  if (!name) {
    alert('Informe o nome do produto.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert('Usuario nao logado')
    return
  }

  const payload = {
    name,
    barbershop_id: barbershopId
  }

  if (price) {
    payload.price = Number(price)
  }

  if (description) {
    payload.description = description
  }

  const { error } = await supabaseClient
    .from('products')
    .insert([payload])

  if (error) {
    alert(`Erro ao cadastrar produto: ${error.message}`)
    return
  }

  nameInput.value = ''
  descriptionInput.value = ''
  priceInput.value = ''
  await carregarProdutosAdmin(barbershopId)
}

// Registra uma venda de produto no caixa e tenta abater do estoque.
window.registrarVendaProduto = async function () {
  const productId = document.getElementById('sale-product-id')?.value
  const quantityValue = document.getElementById('sale-quantity')?.value?.trim() || ''
  const unitPriceValue = document.getElementById('sale-unit-price')?.value?.trim() || ''

  if (!productId) {
    alert('Selecione um produto para registrar a venda.')
    return
  }

  if (!quantityValue || Number.isNaN(Number(quantityValue)) || Number(quantityValue) <= 0) {
    alert('Informe uma quantidade valida.')
    return
  }

  if (!unitPriceValue || Number.isNaN(Number(unitPriceValue)) || Number(unitPriceValue) < 0) {
    alert('Informe um preco unitario valido.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert('Usuario nao logado')
    return
  }

  const quantity = Number(quantityValue)
  const unitPrice = Number(unitPriceValue)
  const saleResult = await processProductSale(productId, quantity, unitPrice)

  if (!saleResult.success) {
    alert(`Erro ao registrar venda: ${saleResult.message}`)
    return
  }

  document.getElementById('sale-product-id').value = ''
  document.getElementById('sale-quantity').value = ''
  document.getElementById('sale-unit-price').value = ''

  await carregarGestao()
}

// Permite ao cliente comprar um produto pela vitrine.
window.comprarProduto = async function (productId) {
  openPurchaseModal(productId)
}

// Confirma a compra iniciada pela vitrine do cliente.
window.confirmarCompraProduto = async function () {
  const product = managementProductsCache.find((item) => item.id === purchaseModalProductId)

  if (!product) {
    alert('Produto nao encontrado.')
    return
  }

  const quantity = Number(document.getElementById('purchase-quantity')?.value || 0)
  const customerName = document.getElementById('purchase-customer-name')?.value?.trim() || ''
  const customerPhone = document.getElementById('purchase-customer-phone')?.value?.trim() || ''

  if (!customerName) {
    alert('Informe seu nome para concluir a compra.')
    return
  }

  if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
    alert('Informe uma quantidade valida.')
    return
  }

  const unitPrice = Number(product.price || 0)
  const saleResult = await processProductSale(product.id, quantity, unitPrice, {
    customerName,
    customerPhone
  })

  if (!saleResult.success) {
    alert(`Erro ao registrar compra: ${saleResult.message}`)
    return
  }

  fecharModalCompra()
  alert('Compra registrada com sucesso!')
  await carregarProdutos()
}

// Fecha o modal de compra do cliente.
window.fecharModalCompra = function (event) {
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
    return
  }

  const modal = document.getElementById('purchase-modal')
  if (!modal) {
    return
  }

  modal.style.display = 'none'
  purchaseModalProductId = null
}

// Atualiza o resumo financeiro exibido no modal de compra.
window.atualizarResumoCompra = function () {
  const product = managementProductsCache.find((item) => item.id === purchaseModalProductId)
  const quantity = Number(document.getElementById('purchase-quantity')?.value || 0)
  const unitPriceElement = document.getElementById('purchase-unit-price')
  const totalPriceElement = document.getElementById('purchase-total-price')

  if (!product || !unitPriceElement || !totalPriceElement) {
    return
  }

  const unitPrice = Number(product.price || 0)
  const total = quantity > 0 ? unitPrice * quantity : 0

  unitPriceElement.textContent = formatCurrency(unitPrice)
  totalPriceElement.textContent = formatCurrency(total)
}

// Abre o modal de compra preenchendo os dados do produto escolhido.
function openPurchaseModal(productId) {
  const product = managementProductsCache.find((item) => item.id === productId)

  if (!product) {
    alert('Produto nao encontrado.')
    return
  }

  purchaseModalProductId = productId

  const modal = document.getElementById('purchase-modal')
  const title = document.getElementById('purchase-modal-title')
  const description = document.getElementById('purchase-modal-description')
  const customerNameInput = document.getElementById('purchase-customer-name')
  const customerPhoneInput = document.getElementById('purchase-customer-phone')
  const quantityInput = document.getElementById('purchase-quantity')

  if (!modal || !title || !description || !quantityInput || !customerNameInput || !customerPhoneInput) {
    return
  }

  title.textContent = product.name
  description.textContent = product.description || 'Defina a quantidade desejada para confirmar a compra.'
  customerNameInput.value = ''
  customerPhoneInput.value = ''
  quantityInput.value = '1'
  quantityInput.max = product.stock_quantity != null ? String(product.stock_quantity) : ''
  modal.style.display = 'grid'
  atualizarResumoCompra()
  customerNameInput.focus()
}

// Executa a gravacao da venda/compra e atualiza o estoque quando necessario.
async function processProductSale(productId, quantity, unitPrice, customerData = {}) {
  const product = managementProductsCache.find((item) => item.id === productId)

  if (!product) {
    return { success: false, message: 'Produto nao encontrado.' }
  }

  if (product.stock_quantity != null && quantity > Number(product.stock_quantity || 0)) {
    return { success: false, message: 'Quantidade indisponivel em estoque.' }
  }

  const barbershopId = product.barbershop_id || await getBarbershop()
  if (!barbershopId) {
    return { success: false, message: 'Nao foi possivel identificar a barbearia do produto.' }
  }

  const totalAmount = quantity * unitPrice
  const salePayload = {
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
    barbershop_id: barbershopId
  }

  if (customerData.customerName) {
    salePayload.customer_name = customerData.customerName
  }

  if (customerData.customerPhone) {
    salePayload.customer_phone = customerData.customerPhone
  }

  let { error } = await supabaseClient
    .from('product_sales')
    .insert([salePayload])

  if (error && (error.message.includes('customer_name') || error.message.includes('customer_phone'))) {
    const fallbackPayload = {
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      barbershop_id: barbershopId
    }

    const fallbackInsert = await supabaseClient
      .from('product_sales')
      .insert([fallbackPayload])

    error = fallbackInsert.error
  }

  if (error) {
    return { success: false, message: error.message }
  }

  if (product.stock_quantity != null) {
    const nextStock = Math.max(Number(product.stock_quantity || 0) - quantity, 0)
    const { error: stockError } = await supabaseClient
      .from('products')
      .update({ stock_quantity: nextStock })
      .eq('id', productId)

    if (stockError) {
      return { success: false, message: `Venda registrada, mas nao foi possivel atualizar o estoque: ${stockError.message}` }
    }
  }

  return { success: true }
}

// Atualiza o estoque manualmente para um produto cadastrado.
window.editarEstoqueProduto = async function (productId, currentStock) {
  const nextStock = prompt('Informe o estoque atual do produto:', currentStock ?? '0')

  if (nextStock === null) {
    return
  }

  const normalizedStock = nextStock.trim()

  if (normalizedStock === '' || Number.isNaN(Number(normalizedStock)) || Number(normalizedStock) < 0) {
    alert('Informe um estoque valido.')
    return
  }

  const { error } = await supabaseClient
    .from('products')
    .update({ stock_quantity: Number(normalizedStock) })
    .eq('id', productId)

  if (error) {
    alert(`Erro ao atualizar estoque: ${error.message}`)
    return
  }

  await carregarGestao()
}

// Apaga uma venda de produto e devolve a quantidade ao estoque quando disponivel.
window.deletarVendaProduto = async function (saleId, productId, quantitySold) {
  if (!confirm('Tem certeza que deseja apagar esta venda de produto?')) {
    return
  }

  const { error: deleteError } = await supabaseClient
    .from('product_sales')
    .delete()
    .eq('id', saleId)

  if (deleteError) {
    alert(`Erro ao apagar venda: ${deleteError.message}`)
    return
  }

  const cachedProduct = managementProductsCache.find((item) => item.id === productId)
  if (cachedProduct && cachedProduct.stock_quantity != null) {
    const { error: stockError } = await supabaseClient
      .from('products')
      .update({ stock_quantity: Number(cachedProduct.stock_quantity || 0) + Number(quantitySold || 0) })
      .eq('id', productId)

    if (stockError) {
      alert(`Venda apagada, mas nao foi possivel devolver ao estoque: ${stockError.message}`)
      await carregarGestao()
      return
    }
  }

  await carregarGestao()
}

// Lista padrao de barbeiros criada para contas de teste.
function getDefaultBarbers(barbershopId) {
  return [
    { name: 'Thiago', barbershop_id: barbershopId },
    { name: 'Rafael', barbershop_id: barbershopId },
    { name: 'Marcos', barbershop_id: barbershopId },
    { name: 'Joao', barbershop_id: barbershopId }
  ]
}

// Lista padrao de servicos criada para contas de teste.
function getDefaultServices(barbershopId) {
  return [
    { name: 'Corte tradicional', barbershop_id: barbershopId },
    { name: 'Corte degradê', barbershop_id: barbershopId },
    { name: 'Barba', barbershop_id: barbershopId },
    { name: 'Corte e barba', barbershop_id: barbershopId },
    { name: 'Sobrancelha', barbershop_id: barbershopId }
  ]
}

// Mostra apenas a tela solicitada e oculta as demais.
function showScreen(screenId) {
  const screenIds = ['login', 'agendar', 'agenda', 'cadastros', 'produtos', 'gestao', 'aprovacoes']

  screenIds.forEach((id) => {
    const screen = document.getElementById(id)

    if (!screen) {
      return
    }

    screen.style.display = id === screenId ? 'block' : 'none'
  })

  document.querySelectorAll('.nav-button[data-screen]').forEach((button) => {
    const isActive = button.dataset.screen === screenId
    button.classList.toggle('is-active', isActive)
  })
}

// Verifica se existe uma sessao ativa antes de abrir telas protegidas.
async function hasActiveSession() {
  if (currentSession) {
    return true
  }

  const { data, error } = await supabaseClient.auth.getSession()

  if (error) {
    console.error('Erro ao verificar sessao', error)
    return false
  }

  currentSession = data.session ?? null

  return Boolean(currentSession)
}

// Atualiza um select com um estado simples como carregando, erro ou vazio.
function renderSelectState(selectId, message, disabled = true) {
  const select = document.getElementById(selectId)

  if (!select) {
    return
  }

  select.innerHTML = `<option value="">${message}</option>`
  select.disabled = disabled
}

// Preenche um select com placeholder e opcoes vindas do banco.
function populateSelect(selectId, items, placeholder) {
  const select = document.getElementById(selectId)

  if (!select) {
    return
  }

  const validItems = Array.isArray(items)
    ? items.filter((item) => item?.id && item?.name)
    : []

  if (validItems.length === 0) {
    renderSelectState(selectId, `${placeholder} indisponivel`, true)
    return
  }

  select.disabled = false
  select.innerHTML = `<option value="">${placeholder}</option>`

  validItems.forEach((item) => {
    select.innerHTML += `<option value="${item.id}">${item.name}</option>`
  })
}

// Carrega a listagem administrativa de barbeiros.
async function carregarBarbeirosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('barbers')
    .select('id, name')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('barbers-admin-list', `Erro ao carregar barbeiros: ${error.message}`)
    return
  }

  renderAdminItems('barbers-admin-list', data, 'Nenhum barbeiro cadastrado.', 'barbers')
}

// Carrega a listagem administrativa de servicos.
async function carregarServicosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('services')
    .select('id, name, description, price')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('services-admin-list', `Erro ao carregar servicos: ${error.message}`)
    return
  }

  const formattedServices = (data || []).map((item) => ({
    ...item,
    meta: buildMetaText(item.description, item.price)
  }))

  renderAdminItems('services-admin-list', formattedServices, 'Nenhum servico cadastrado.', 'services')
}

// Carrega a listagem administrativa de produtos.
async function carregarProdutosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('id, name, description, price')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('products-admin-list', `Erro ao carregar produtos: ${error.message}`)
    return
  }

  const formattedProducts = (data || []).map((item) => ({
    ...item,
    meta: buildMetaText(item.description, item.price)
  }))

  renderAdminItems('products-admin-list', formattedProducts, 'Nenhum produto cadastrado.', 'products')
}

// Busca os produtos com suporte opcional ao controle de estoque.
async function fetchManagementProducts(barbershopId) {
  let stockQueryBuilder = supabaseClient
    .from('products')
    .select('id, name, description, price, stock_quantity, barbershop_id')
    .order('name', { ascending: true })

  if (barbershopId) {
    stockQueryBuilder = stockQueryBuilder.eq('barbershop_id', barbershopId)
  }

  const stockQuery = await stockQueryBuilder

  if (!stockQuery.error) {
    return {
      items: stockQuery.data || [],
      stockSupported: true,
      errorMessage: ''
    }
  }

  let fallbackQueryBuilder = supabaseClient
    .from('products')
    .select('id, name, description, price, barbershop_id')
    .order('name', { ascending: true })

  if (barbershopId) {
    fallbackQueryBuilder = fallbackQueryBuilder.eq('barbershop_id', barbershopId)
  }

  const fallbackQuery = await fallbackQueryBuilder

  if (fallbackQuery.error) {
    return {
      items: [],
      stockSupported: false,
      errorMessage: `Erro ao carregar produtos: ${fallbackQuery.error.message}`
    }
  }

  return {
    items: fallbackQuery.data || [],
    stockSupported: false,
    errorMessage: 'Adicione a coluna stock_quantity na tabela products para controlar estoque.'
  }
}

// Busca agendamentos com relacoes de servico e barbeiro para calculos financeiros.
async function fetchAppointmentsWithRelations(barbershopId) {
  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      appointment_time,
      customer_name,
      status,
      finalized_at,
      services (
        name,
        price
      ),
      barbers (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .eq('status', 'finalized')
    .order('appointment_time', { ascending: false })

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        appointment_time,
        customer_name,
        services (
          name,
          price
        ),
        barbers (
          name
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('appointment_time', { ascending: false })
  } else if (!query.error) {
    appointmentWorkflowSupport = true
  }

  return {
    items: query.data || [],
    error: query.error
  }
}

// Busca os servicos realizados como fonte principal do financeiro.
async function fetchServiceSales(barbershopId) {
  const query = await supabaseClient
    .from('service_sales')
    .select(`
      id,
      service_price,
      customer_name,
      performed_at,
      services (
        name
      ),
      barbers (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('performed_at', { ascending: false })

  return {
    items: query.data || [],
    error: query.error
  }
}

// Busca vendas de produtos se a tabela product_sales existir.
async function fetchProductSales(barbershopId) {
  const query = await supabaseClient
    .from('product_sales')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      total_amount,
      created_at,
      products (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false })
    .limit(12)

  return {
    items: query.data || [],
    error: query.error
  }
}

// Renderiza os produtos em formato de vitrine para o portal do cliente.
function renderProductsCatalog(items, stockSupported = false) {
  const container = document.getElementById('products-catalog-list')
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderCatalogMessage('Nenhum produto disponivel no momento.')
    return
  }

  container.innerHTML = items
    .map((item) => {
      const description = item.description
        ? `<span class="catalog-meta">${item.description}</span>`
        : '<span class="catalog-meta">Produto sem descricao cadastrada.</span>'
      const price = item.price != null
        ? `<strong class="catalog-price">R$ ${Number(item.price).toFixed(2)}</strong>`
        : '<strong class="catalog-price">Consulte no local</strong>'
      const stockLabel = stockSupported
        ? `<span class="catalog-stock">Estoque: ${item.stock_quantity ?? 0} unidade(s)</span>`
        : ''
      const canBuy = currentPortal === 'cliente'
      const buyButton = canBuy
        ? `<button class="catalog-action" onclick="comprarProduto('${item.id}')">Comprar produto</button>`
        : ''

      return `
        <article class="catalog-card">
          <span class="catalog-kicker">Produto</span>
          <h2>${item.name}</h2>
          ${description}
          ${stockLabel}
          ${price}
          ${buyButton}
        </article>
      `
    })
    .join('')
}

// Exibe mensagens simples na vitrine de produtos.
function renderCatalogMessage(message) {
  const container = document.getElementById('products-catalog-list')
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Renderiza cards de agendamento em listas reutilizaveis.
function renderAppointmentCards(containerId, items, emptyMessage) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderHistoryMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = items
    .map((item) => {
      const isFinalized = item.status === 'finalized'
      const barberName = item.barbers?.name ? `<span class="agenda-meta">Barbeiro: ${item.barbers.name}</span>` : ''
      const serviceName = item.services?.name ? `<span class="agenda-meta">Servico: ${item.services.name}</span>` : ''
      const serviceDescription = item.services?.description
        ? `<span class="agenda-meta">${item.services.description}</span>`
        : ''
      const servicePrice = item.services?.price != null
        ? `<span class="agenda-meta">Preco: R$ ${Number(item.services.price).toFixed(2)}</span>`
        : ''
      const appointmentDate = `<span class="agenda-meta">${new Date(item.appointment_time).toLocaleString()}</span>`
      const statusChip = item.status
        ? `<span class="status-chip ${isFinalized ? 'status-chip-finalized' : 'status-chip-scheduled'}">${isFinalized ? 'Finalizado' : 'Agendado'}</span>`
        : ''
      const finalizedMeta = item.finalized_at
        ? `<span class="agenda-meta">Finalizado em: ${new Date(item.finalized_at).toLocaleString()}</span>`
        : ''
      const actions = []

      if (containerId === 'lista' && !isFinalized && appointmentWorkflowSupport !== false) {
        actions.push(`<button onclick="finalizarAgendamento('${item.id}')">Finalizar</button>`)
      }

      if (containerId === 'lista') {
        actions.push(`<button class="danger-action" onclick="deletarAgendamento('${item.id}')">Apagar</button>`)
      }

      const actionButtons = actions.length > 0
        ? `<div class="agenda-actions">${actions.join('')}</div>`
        : ''

      return `
        <div class="agenda-card">
          <strong>${item.customer_name}</strong>
          ${statusChip}
          ${barberName}
          ${serviceName}
          ${serviceDescription}
          ${servicePrice}
          ${appointmentDate}
          ${finalizedMeta}
          ${actionButtons}
        </div>
      `
    })
    .join('')
}

// Exibe uma mensagem simples nas listas de historico.
function renderHistoryMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Preenche o select usado para registrar uma venda de produto.
function populateSaleProducts(items) {
  const select = document.getElementById('sale-product-id')
  if (!select) {
    return
  }

  select.innerHTML = '<option value="">Selecione o produto</option>'

  items.forEach((item) => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    option.dataset.price = item.price ?? ''
    select.appendChild(option)
  })

  select.onchange = function () {
    const selected = items.find((item) => item.id === select.value)
    const unitPriceInput = document.getElementById('sale-unit-price')

    if (!unitPriceInput) {
      return
    }

    unitPriceInput.value = selected?.price != null ? Number(selected.price).toFixed(2) : ''
  }
}

// Exibe um resumo dos principais indicadores de gestao.
function renderManagementSummary(serviceSalesResult, appointmentsResult, productSalesResult) {
  const container = document.getElementById('management-summary')
  if (!container) {
    return
  }

  const serviceRevenueSource = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (serviceRevenueSource.error) {
    renderManagementMessage('management-summary', `Erro ao carregar indicadores: ${serviceRevenueSource.error.message}`)
    return
  }

  const serviceRevenue = sumServiceRevenue(serviceRevenueSource.items, serviceRevenueSource.mode)
  const productRevenue = productSalesResult.error ? 0 : sumProductSalesRevenue(productSalesResult.items)
  const totalRevenue = serviceRevenue + productRevenue
  const appointmentsCount = serviceRevenueSource.items.length
  const servicesLabel = serviceRevenueSource.mode === 'service_sales'
    ? 'Servicos realizados'
    : 'Servicos realizados (fallback)'

  const cards = [
    { label: 'Caixa total', value: formatCurrency(totalRevenue) },
    { label: servicesLabel, value: formatCurrency(serviceRevenue) },
    { label: 'Vendas de produtos', value: productSalesResult.error ? 'Tabela ausente' : formatCurrency(productRevenue) },
    { label: 'Atendimentos registrados', value: String(appointmentsCount) }
  ]

  container.innerHTML = cards
    .map((card) => `
      <article class="metric-card">
        <span class="metric-label">${card.label}</span>
        <strong class="metric-value">${card.value}</strong>
      </article>
    `)
    .join('')
}

// Exibe a lista de estoque ou a orientacao para habilitar a coluna de estoque.
function renderStockList(items, stockSupported, errorMessage = '') {
  const container = document.getElementById('stock-list')
  if (!container) {
    return
  }

  if (errorMessage && items.length === 0) {
    renderManagementMessage('stock-list', errorMessage)
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderManagementMessage('stock-list', 'Nenhum produto cadastrado para controlar estoque.')
    return
  }

  if (!stockSupported) {
    container.innerHTML = `
      <div class="admin-empty">${errorMessage || 'Adicione a coluna stock_quantity na tabela products para controlar estoque.'}</div>
      ${items.map((item) => `
        <div class="management-row">
          <div>
            <strong>${item.name}</strong>
            <span class="management-meta">${item.description || 'Sem descricao cadastrada.'}</span>
          </div>
          <span class="management-badge">Sem estoque</span>
        </div>
      `).join('')}
    `
    return
  }

  container.innerHTML = items
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.name}</strong>
          <span class="management-meta">Em estoque: ${item.stock_quantity ?? 0} unidade(s)</span>
        </div>
        <button class="edit-button" onclick="editarEstoqueProduto('${item.id}', '${item.stock_quantity ?? 0}')">Atualizar estoque</button>
      </div>
    `)
    .join('')
}

// Exibe os valores de servicos a partir dos agendamentos registrados.
function renderServiceRevenue(serviceSalesResult, appointmentsResult) {
  const source = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (source.error) {
    renderManagementMessage('services-revenue-list', `Erro ao carregar servicos: ${source.error.message}`)
    return
  }

  const grouped = new Map()

  source.items.forEach((item) => {
    const serviceName = item.services?.name || 'Servico sem nome'
    const current = grouped.get(serviceName) || { count: 0, total: 0 }
    current.count += 1
    current.total += getServiceRevenueValue(item, source.mode)
    grouped.set(serviceName, current)
  })

  const rows = Array.from(grouped.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      title: name,
      meta: `${data.count} atendimento(s)`,
      value: formatCurrency(data.total)
    }))

  renderManagementRows(
    'services-revenue-list',
    rows,
    source.mode === 'service_sales'
      ? 'Nenhum servico realizado ainda.'
      : 'Nenhum servico realizado ainda. Aguardando registros em service_sales.'
  )
}

// Exibe o faturamento total gerado por cada barbeiro cadastrado.
function renderBarberRevenue(serviceSalesResult, appointmentsResult) {
  const source = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (source.error) {
    renderManagementMessage('barber-revenue-list', `Erro ao carregar barbeiros: ${source.error.message}`)
    return
  }

  const grouped = new Map()

  source.items.forEach((item) => {
    const barberName = item.barbers?.name || 'Barbeiro sem nome'
    const current = grouped.get(barberName) || { count: 0, total: 0 }
    current.count += 1
    current.total += getServiceRevenueValue(item, source.mode)
    grouped.set(barberName, current)
  })

  const rows = Array.from(grouped.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      title: name,
      meta: `${data.count} atendimento(s)`,
      value: formatCurrency(data.total)
    }))

  renderManagementRows(
    'barber-revenue-list',
    rows,
    source.mode === 'service_sales'
      ? 'Nenhum faturamento por barbeiro registrado ainda.'
      : 'Nenhum faturamento por barbeiro registrado ainda. Aguardando registros em service_sales.'
  )
}

// Exibe as ultimas vendas de produtos no painel de gestao.
function renderProductSales(productSalesResult) {
  if (productSalesResult.error) {
    renderManagementMessage('sales-list', 'Crie a tabela product_sales para registrar vendas de produtos.')
    return
  }

  const container = document.getElementById('sales-list')
  if (!container) {
    return
  }

  if (!Array.isArray(productSalesResult.items) || productSalesResult.items.length === 0) {
    renderManagementMessage('sales-list', 'Nenhuma venda de produto registrada ainda.')
    return
  }

  container.innerHTML = productSalesResult.items
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.products?.name || 'Produto sem nome'}</strong>
          <span class="management-meta">${item.quantity || 0} unidade(s) | ${new Date(item.created_at).toLocaleString()}</span>
        </div>
        <div class="management-actions">
          <span class="management-value">${formatCurrency(item.total_amount || 0)}</span>
          <button class="edit-button" onclick="deletarVendaProduto('${item.id}', '${item.product_id}', '${item.quantity || 0}')">Apagar venda</button>
        </div>
      </div>
    `)
    .join('')
}

// Renderiza uma lista padrao de linhas para a pagina de gestao.
function renderManagementRows(containerId, rows, emptyMessage) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    renderManagementMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = rows
    .map((row) => `
      <div class="management-row">
        <div>
          <strong>${row.title}</strong>
          <span class="management-meta">${row.meta}</span>
        </div>
        <span class="management-value">${row.value}</span>
      </div>
    `)
    .join('')
}

// Exibe uma mensagem simples nos blocos da area de gestao.
function renderManagementMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Exibe mensagens no bloco administrativo de autorizacao do portal barbeiro.
function renderAccessManagementMessage(message) {
  const card = document.getElementById('access-management-card')
  const container = document.getElementById('approved-barbers-list')

  if (card) {
    card.style.display = 'block'
  }

  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Carrega os emails autorizados para o portal do barbeiro no painel do admin.
async function carregarGestaoDeAcessos(barbershopId) {
  const card = document.getElementById('access-management-card')
  const currentUser = await getCurrentUser()

  if (!card) {
    return
  }

  if (!isAdminEmail(currentUser?.email)) {
    card.style.display = 'none'
    return
  }

  card.style.display = 'block'

  const { data, error } = await supabaseClient
    .from('barber_access')
    .select('email, approved_at, approved_by_email, is_active')
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .order('email', { ascending: true })

  if (error) {
    renderAccessManagementMessage(`Erro ao carregar os acessos: ${error.message}`)
    return
  }

  const container = document.getElementById('approved-barbers-list')
  if (!container) {
    return
  }

  if (!data || data.length === 0) {
    renderAccessManagementMessage('Nenhum email autorizado ainda.')
    return
  }

  container.innerHTML = data
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.email}</strong>
          <span class="management-meta">Liberado por ${item.approved_by_email || ADMIN_EMAIL} em ${item.approved_at ? new Date(item.approved_at).toLocaleString() : '-'}</span>
        </div>
        <div class="management-actions">
          <button class="danger-action" type="button" onclick="revogarEmailBarbeiro('${item.email}')">Revogar</button>
        </div>
      </div>
    `)
    .join('')
}

// Autoriza manualmente um email para acessar o portal do barbeiro.
window.aprovarEmailBarbeiro = async function () {
  const currentUser = await getCurrentUser()
  if (!isAdminEmail(currentUser?.email)) {
    alert('Somente o admin pode liberar acesso ao portal do barbeiro.')
    return
  }

  const input = document.getElementById('approved-barber-email')
  const email = input?.value.trim().toLowerCase()
  const barbershopId = await getBarbershop()

  if (!email) {
    alert('Informe um email para autorizar.')
    return
  }

  if (!barbershopId) {
    alert('Nao foi possivel identificar a barbearia do admin.')
    return
  }

  const { error } = await supabaseClient
    .from('barber_access')
    .upsert(
      [
        {
          email,
          barbershop_id: barbershopId,
          approved_by_email: currentUser.email,
          approved_at: new Date().toISOString(),
          is_active: true
        }
      ],
      { onConflict: 'email' }
    )

  if (error) {
    alert(`Erro ao liberar email: ${error.message}`)
    return
  }

  if (input) {
    input.value = ''
  }

  await carregarGestaoDeAcessos(barbershopId)
}

// Revoga o acesso de um email ao portal do barbeiro.
window.revogarEmailBarbeiro = async function (email) {
  const currentUser = await getCurrentUser()
  if (!isAdminEmail(currentUser?.email)) {
    alert('Somente o admin pode revogar acessos.')
    return
  }

  if (!confirm(`Revogar o acesso do email ${email}?`)) {
    return
  }

  const { error } = await supabaseClient
    .from('barber_access')
    .update({ is_active: false })
    .eq('email', email)

  if (error) {
    alert(`Erro ao revogar acesso: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  await carregarGestaoDeAcessos(barbershopId)
}

// Escolhe service_sales como fonte principal e usa appointments apenas como fallback.
function getServiceRevenueSource(serviceSalesResult, appointmentsResult) {
  if (!serviceSalesResult.error && Array.isArray(serviceSalesResult.items) && serviceSalesResult.items.length > 0) {
    return {
      items: serviceSalesResult.items,
      mode: 'service_sales',
      error: null
    }
  }

  if (!appointmentsResult.error) {
    return {
      items: appointmentsResult.items || [],
      mode: 'appointments',
      error: null
    }
  }

  return {
    items: [],
    mode: 'service_sales',
    error: serviceSalesResult.error || appointmentsResult.error
  }
}

// Detecta quando a tabela appointments ainda nao possui colunas de identidade do cliente.
function isMissingAppointmentIdentityColumnsError(error) {
  const message = error?.message || ''
  return message.includes('customer_user_id') || message.includes('customer_email')
}

// Detecta quando a tabela appointments ainda nao possui colunas para acompanhar finalizacao.
function isMissingAppointmentWorkflowColumnsError(error) {
  const message = error?.message || ''
  return message.includes('status') || message.includes('finalized_at')
}

// Escapa caracteres especiais usados nos filtros OR do Supabase/PostgREST.
function escapeSupabaseFilterValue(value) {
  return String(value || '').replace(/,/g, '\\,').replace(/\)/g, '\\)')
}

// Remove duplicidades caso o mesmo agendamento seja encontrado por id de usuario e email.
function deduplicateAppointments(items) {
  const byId = new Map()

  ;(items || []).forEach((item) => {
    if (!item?.id || byId.has(item.id)) {
      return
    }

    byId.set(item.id, item)
  })

  return Array.from(byId.values())
}

// Extrai o valor financeiro de um item de service_sales ou appointments.
function getServiceRevenueValue(item, mode) {
  if (mode === 'service_sales') {
    return Number(item.service_price || 0)
  }

  return Number(item.services?.price || 0)
}

// Soma o faturamento gerado pelos servicos registrados.
function sumServiceRevenue(items, mode) {
  return (items || []).reduce((total, item) => total + getServiceRevenueValue(item, mode), 0)
}

// Soma o valor das vendas de produtos registradas no caixa.
function sumProductSalesRevenue(items) {
  return (items || []).reduce((total, item) => total + Number(item.total_amount || 0), 0)
}

// Formata qualquer valor numerico em moeda brasileira.
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

// Remove um item administrativo da tabela escolhida.
window.deletarCadastro = async function (tableName, id) {
  if (!confirm('Tem certeza que deseja apagar este cadastro?')) {
    return
  }

  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq('id', id)

  if (error) {
    alert(`Erro ao apagar cadastro: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    return
  }

  if (tableName === 'barbers') {
    await carregarDados()
    await carregarBarbeirosAdmin(barbershopId)
  }

  if (tableName === 'services') {
    await carregarDados()
    await carregarServicosAdmin(barbershopId)
  }

  if (tableName === 'products') {
    await carregarProdutosAdmin(barbershopId)
  }
}

// Atualiza o preco de um servico ou produto na tela de cadastros.
window.editarPrecoCadastro = async function (tableName, id, currentPrice) {
  const nextPrice = prompt('Informe o novo preco:', currentPrice ?? '')

  if (nextPrice === null) {
    return
  }

  const normalizedPrice = nextPrice.trim().replace(',', '.')

  if (!normalizedPrice || Number.isNaN(Number(normalizedPrice))) {
    alert('Informe um preco valido.')
    return
  }

  const { error } = await supabaseClient
    .from(tableName)
    .update({ price: Number(normalizedPrice) })
    .eq('id', id)

  if (error) {
    alert(`Erro ao editar preco: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    return
  }

  if (tableName === 'services') {
    await carregarServicosAdmin(barbershopId)
    return
  }

  if (tableName === 'products') {
    await carregarProdutosAdmin(barbershopId)
  }
}

// Exibe uma mensagem simples nas listas administrativas.
function renderAdminMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Renderiza os itens das listas de cadastros.
function renderAdminItems(containerId, items, emptyMessage, tableName) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderAdminMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = items
    .map((item) => {
      const label = item.label || item.name
      const meta = item.meta ? `<span class="admin-meta">${item.meta}</span>` : ''
      const canEditPrice = tableName === 'services' || tableName === 'products'
      const currentPrice = item.price != null ? Number(item.price).toFixed(2) : ''
      const editPriceButton = canEditPrice
        ? `<button class="edit-button" onclick="editarPrecoCadastro('${tableName}', '${item.id}', '${currentPrice}')">Editar preco</button>`
        : ''
      return `
        <div class="admin-item">
          <div>
            <strong>${label}</strong>
            ${meta}
          </div>
          <div class="admin-actions">
            ${editPriceButton}
            <button onclick="deletarCadastro('${tableName}', '${item.id}')">Apagar</button>
          </div>
        </div>
      `
    })
    .join('')
}

// Ativa ou desativa os controles protegidos quando o usuario faz login/logout.
function updateProtectedUi(isLoggedIn) {
  document.querySelectorAll('[data-protected="true"]').forEach((element) => {
    element.disabled = !isLoggedIn
  })

  const logoutButton = document.getElementById('nav-sair')
  if (logoutButton) {
    logoutButton.style.display = isLoggedIn ? 'inline-flex' : 'none'
  }

  updatePortalNavigation()
}

// Monta o texto secundario exibido em servicos e produtos.
function buildMetaText(description, price) {
  const parts = []

  if (description) {
    parts.push(description)
  }

  if (price != null && price !== '') {
    parts.push(`R$ ${Number(price).toFixed(2)}`)
  }

  return parts.join(' | ')
}

// Seleciona o portal atual na tela inicial.
window.selecionarPortal = function (portal) {
  setPortal(portal)
  applyPortalUi()
}

// Limpa o portal selecionado e volta ao estado inicial do login.
window.limparPortalSelecionado = function () {
  currentPortal = null
  localStorage.removeItem(PORTAL_STORAGE_KEY)
  applyPortalUi()
}

// Atualiza os textos, botoes e navegacao conforme o portal escolhido.
function applyPortalUi() {
  updateLoginPortalUi()
  updatePortalNavigation()
}

// Persiste o portal para manter a experiencia apos recarregar.
function setPortal(portal) {
  currentPortal = portal
  localStorage.setItem(PORTAL_STORAGE_KEY, portal)
}

// Restaura a escolha do portal salva no navegador.
function restorePortalSelection() {
  const savedPortal = localStorage.getItem(PORTAL_STORAGE_KEY)

  if (savedPortal === 'cliente' || savedPortal === 'barbeiro') {
    currentPortal = savedPortal
  }
}

// Atualiza a area de login com o portal selecionado.
function updateLoginPortalUi() {
  const clienteButton = document.getElementById('portal-cliente')
  const barbeiroButton = document.getElementById('portal-barbeiro')
  const selectedPortalLabel = document.getElementById('selected-portal-label')
  const signupButton = document.getElementById('signup-button')
  const loginTitle = document.getElementById('login-title')
  const loginDescription = document.getElementById('login-description')
  const emailInput = document.getElementById('email')
  const typedEmail = emailInput?.value?.trim().toLowerCase() || ''
  const canCreateBarberAccount = currentPortal === 'barbeiro' && isAdminEmail(typedEmail)

  clienteButton?.classList.toggle('is-active', currentPortal === 'cliente')
  barbeiroButton?.classList.toggle('is-active', currentPortal === 'barbeiro')

  if (selectedPortalLabel) {
    const labels = {
      cliente: 'Portal selecionado: Cliente. Acesso a agendamento e produtos.',
      barbeiro: canCreateBarberAccount
        ? 'Portal selecionado: Barbeiro. Admin liberado para criar contas e gerenciar acessos.'
        : 'Portal selecionado: Barbeiro. Acesso sujeito a liberacao manual do admin.',
      default: 'Selecione um portal para continuar.'
    }
    selectedPortalLabel.textContent = labels[currentPortal] || labels.default
  }

  if (signupButton) {
    signupButton.style.display = canCreateBarberAccount ? 'inline-flex' : 'none'
  }

  if (loginTitle) {
    loginTitle.textContent = currentPortal === 'cliente'
      ? 'Entrar no portal do cliente'
      : currentPortal === 'barbeiro'
        ? 'Entrar no portal do barbeiro'
        : 'Como voce deseja entrar?'
  }

  if (loginDescription) {
    loginDescription.textContent = currentPortal === 'cliente'
      ? 'No portal do cliente voce agenda horarios e consulta os produtos da barbearia.'
      : currentPortal === 'barbeiro'
        ? canCreateBarberAccount
          ? 'No portal do barbeiro voce acompanha agenda, gestao, estoque e cadastros. Como admin, voce tambem pode criar contas e liberar emails.'
          : 'No portal do barbeiro voce acompanha agenda, gestao, estoque e cadastros, com liberacao manual do admin.'
        : 'Selecione se o acesso sera como cliente ou barbeiro antes de continuar.'
  }
}

// Exibe apenas os botoes de menu permitidos para o portal atual.
function updatePortalNavigation() {
  document.querySelectorAll('.nav-button[data-portal]').forEach((button) => {
    const allowedPortals = (button.dataset.portal || '').split(',').map((item) => item.trim())
    const requiresAdmin = button.dataset.adminOnly === 'true'
    const shouldShow = currentPortal
      ? allowedPortals.includes(currentPortal) && (!requiresAdmin || isAdminEmail(currentSession?.user?.email))
      : false
    button.style.display = shouldShow ? 'inline-flex' : 'none'
  })
}

// Define a tela inicial padrao do portal selecionado.
function getDefaultScreenForPortal() {
  return currentPortal === 'barbeiro' ? 'gestao' : 'agendar'
}

// Verifica se a tela faz parte das permissoes do portal.
function isScreenAllowedForPortal(screenId) {
  if (screenId === 'login') {
    return true
  }

  if (screenId === 'aprovacoes') {
    return currentPortal === 'barbeiro' && isAdminEmail(currentSession?.user?.email)
  }

  const portalPermissions = {
    cliente: ['agendar', 'produtos'],
    barbeiro: ['gestao', 'agenda', 'cadastros']
  }

  return portalPermissions[currentPortal]?.includes(screenId) ?? false
}

// Dispara o carregamento dos dados necessarios para cada tela.
async function carregarPortalData(screenId) {
  if (screenId === 'agendar') {
    await carregarDados()
    if (currentPortal === 'cliente') {
      await carregarHistoricoCliente()
    }
    return
  }

  if (screenId === 'agenda') {
    await carregarAgenda()
    return
  }

  if (screenId === 'cadastros') {
    await carregarCadastros()
    return
  }

  if (screenId === 'produtos') {
    await carregarProdutos()
    return
  }

  if (screenId === 'gestao') {
    await carregarGestao()
    return
  }

  if (screenId === 'aprovacoes') {
    const barbershopId = await getBarbershop()

    if (!barbershopId) {
      renderAccessManagementMessage('Faca login como admin para gerenciar os acessos do portal barbeiro.')
      return
    }

    await carregarGestaoDeAcessos(barbershopId)
  }
}

// Alterna entre o tema gelo claro e gelo dark.
window.toggleTheme = function () {
  const isDarkMode = document.body.classList.toggle('dark-mode')
  const nextTheme = isDarkMode ? 'dark' : 'light'

  localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  updateThemeToggleLabel(isDarkMode)
}

// Aplica o tema salvo no navegador ao iniciar a pagina.
function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const isDarkMode = savedTheme === 'dark'

  document.body.classList.toggle('dark-mode', isDarkMode)
  updateThemeToggleLabel(isDarkMode)
}

// Atualiza o texto do botao de tema.
function updateThemeToggleLabel(isDarkMode) {
  const toggleButton = document.getElementById('theme-toggle')

  if (!toggleButton) {
    return
  }

  toggleButton.textContent = isDarkMode ? 'Light' : 'Dark'
}

// Abre ou fecha o seletor customizado de servicos.
window.toggleServicePicker = function () {
  const picker = document.getElementById('service-picker')
  const options = document.getElementById('service-options')
  const trigger = document.getElementById('service-trigger')

  if (!picker || !options || !trigger) {
    return
  }

  const isOpen = picker.classList.toggle('open')
  options.style.display = isOpen ? 'grid' : 'none'
  trigger.setAttribute('aria-expanded', String(isOpen))
}

// Atualiza o texto visivel do seletor de servicos.
window.updateServiceTriggerLabel = function (fallbackMessage = 'Selecione os servicos') {
  const trigger = document.getElementById('service-trigger')

  if (!trigger) {
    return
  }

  const selectedLabels = Array.from(
    document.querySelectorAll('#service-options input[type="checkbox"]:checked')
  ).map((input) => input.parentElement?.querySelector('span')?.textContent?.trim())
    .filter(Boolean)

  if (selectedLabels.length === 0) {
    trigger.textContent = fallbackMessage
    return
  }

  if (selectedLabels.length === 1) {
    trigger.textContent = selectedLabels[0]
    return
  }

  trigger.textContent = `${selectedLabels.length} servicos selecionados`
}

// Fecha o seletor de servicos ao clicar fora dele.
document.addEventListener('click', (event) => {
  const picker = document.getElementById('service-picker')
  const options = document.getElementById('service-options')
  const trigger = document.getElementById('service-trigger')

  if (!picker || !options || !trigger) {
    return
  }

  if (picker.contains(event.target)) {
    return
  }

  picker.classList.remove('open')
  options.style.display = 'none'
  trigger.setAttribute('aria-expanded', 'false')
})

init()

