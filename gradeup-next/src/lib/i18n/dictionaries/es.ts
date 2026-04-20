/**
 * Spanish (US-Spanish audience) dictionary.
 *
 * Voice & tone rules
 * ──────────────────
 *   - Parent-facing surfaces use "usted" (formal) — respects parental
 *     authority norms in Latino households and matches how we actually
 *     talk to parents in concierge calls.
 *   - Athlete-facing surfaces (e.g., home page hero CTAs aimed at kids)
 *     use "tú" (informal) — matches how teens read copy.
 *   - Marketing one-liners that could land either way default to the
 *     reader being the parent, since HS-NIL in pilot states is
 *     parent-gated by definition.
 *   - Brand/pricing surfaces use "usted" (business Spanish convention).
 *
 * Translation choices
 * ───────────────────
 *   - "NIL" stays "NIL" — the term is already in common Latino-press use
 *     and translating to "nombre, imagen y semejanza" buries the keyword.
 *   - "scholar-athlete" = "atleta-estudiante" (literal inversion is how
 *     Spanish press renders the concept; preserves the dual emphasis).
 *   - "GPA" stays "GPA" — US-Spanish audience knows this term from the
 *     US school system. We occasionally gloss as "promedio académico" on
 *     first use within a block but keep GPA elsewhere for brevity.
 *   - "verified" = "verificado / verificada" (match noun gender).
 *   - "deal" = "acuerdo" in most cases; "trato" occasionally for variety.
 *
 * Shape must match src/lib/i18n/dictionaries/en.ts (enforced via
 * `Dictionary` type import in get-dictionary.ts).
 */
import type { Dictionary } from './en';

export const es: Dictionary = {
  common: {
    nav: {
      athletes: 'Atletas',
      brands: 'Marcas',
      howItWorks: 'Cómo funciona',
      valuation: 'Valor NIL',
      solutions: 'Soluciones',
      solutionsOverview: 'Panorama — todas las personas',
      solutionsParents: 'Padres',
      solutionsAthletes: 'Atletas',
      solutionsBrands: 'Marcas',
      solutionsAds: 'Directores atléticos',
      solutionsStateAds: 'Portal estatal',
      caseStudies: 'Casos de éxito',
      blog: 'Blog',
      pricing: 'Precios',
      discover: 'Descubrir',
      opportunities: 'Oportunidades',
      logIn: 'Iniciar sesión',
      getStarted: 'Comenzar',
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
    },
    footer: {
      tagline:
        'NIL, diseñado para las personas que en realidad firman el permiso.',
      product: 'Producto',
      company: 'Empresa',
      legal: 'Legal',
      rights: 'Todos los derechos reservados.',
    },
    localeSwitcher: {
      label: 'Idioma',
      ariaLabel: 'Seleccionar idioma',
      english: 'English',
      spanish: 'Español',
    },
    fallbackBanner: {
      message:
        'Esta página aún no está disponible en español. Mostrando la versión en inglés.',
      dismiss: 'Cerrar',
    },
    ctas: {
      signUpAthlete: 'Únete como atleta — es gratis',
      partnerBrand: 'Asóciese como marca',
      createAthleteProfile: 'Crear perfil de atleta',
      createBrandAccount: 'Crear cuenta de marca',
      startBrandPlus: 'Comenzar con Brand Plus',
      learnMore: 'Saber más',
      seeCaseStudies: 'Ver los casos de éxito',
      joinWaitlist: 'Unirse a la lista de espera de GradeUp HS',
    },
  },

  home: {
    metadata: {
      title: 'GradeUp NIL — Tu GPA vale dinero',
      description:
        'La única plataforma NIL donde las buenas calificaciones desbloquean mejores acuerdos. Mayor GPA = mayor valor. Gana dinero por tu excelencia.',
    },
    hero: {
      badge: 'Plataforma compatible con la NCAA',
      titleLine1: 'Tu GPA',
      titleLine2: 'Vale',
      titleLine3: 'Dinero.',
      subtitle:
        'La única plataforma NIL donde las calificaciones desbloquean mejores acuerdos. Mayor GPA = mayor valor. Gana dinero por tu excelencia.',
      dualAudience:
        'Hecha para atletas-estudiantes desde 8.º grado hasta el último año de universidad, junto con los padres, entrenadores y directores atléticos que los apoyan.',
      ctaAthlete: 'Únete como atleta — es gratis',
      ctaBrand: 'Asóciate como marca',
      trustNcaa: 'Compatible con la NCAA',
      trustNoCard: 'Sin tarjeta de crédito',
      trustSignup: 'Registro en 2 minutos',
      statsPaid: 'Pagado a atletas',
      statsVerified: 'Atletas verificados',
      statsAvgGpa: 'GPA promedio',
    },
    partners: {
      schoolsTrusted: 'Atletas de más de 40 universidades confían en GradeUp',
      brandsHeading: 'Marcas que están reclutando activamente',
    },
    valuationCta: {
      eyebrow: 'Nuevo · Gratis',
      heading: '¿Cuánto vale su atleta-estudiante?',
      body:
        'Deporte, estado, calificaciones, seguidores — responda cinco preguntas y obtenga un rango de valor NIL honesto. No se necesita registro para ver el número.',
      cta: 'Descubra cuánto vale su atleta',
    },
    featured: {
      eyebrow: 'Atletas reales. Ingresos reales.',
      title: 'Atletas-estudiantes',
      titleAccent: 'que cobran',
      subtitle:
        'Conoce a atletas verificados que están ganando con GradeUp. Su GPA es su ventaja competitiva.',
      ctaHeading: '¿Te ves aquí?',
      ctaBody: 'Tu excelencia académica + tu talento atlético = oportunidad',
      ctaPrimary: 'Crea tu perfil — gratis',
      ctaSecondary: 'Ver oportunidades',
      trustVerified: 'Todos los atletas verificados',
      trustCompliant: 'Cumple con la NCAA',
      trustSpeed: 'Acuerdos en 48 horas',
    },
    howItWorks: {
      eyebrow: 'Míralo en acción',
      titlePrefix: 'Del',
      titleMid: 'registro',
      titleTo: 'al',
      titleAccent: 'día de pago',
      subtitle:
        'Mira cómo funciona GradeUp y después sigue los pasos sencillos para empezar a ganar.',
      step1Title: 'Crea tu perfil',
      step1Desc: 'Regístrate y conecta tus registros académicos en minutos.',
      step1Stat: '10 min en promedio',
      step2Title: 'Verifícate',
      step2Desc:
        'Verificamos tu inscripción, tu deporte y tu GPA para confirmar autenticidad.',
      step2Stat: 'Verificación en 24 h',
      step3Title: 'Cobra',
      step3Desc:
        'Emparéjate con marcas y empieza a ganar según tu valor real.',
      step3Stat: '$1,850 por acuerdo promedio',
      sideHeading: 'Tres pasos simples',
      sideBody:
        'Nuestra tasa de conversión del 68 % significa que la mayoría de los atletas cierran acuerdos en menos de una semana.',
      finalCta: 'Comienza tu camino',
      finalNote: 'Gratis · Sin tarjeta de crédito',
    },
    provenResults: {
      eyebrow: 'Resultados comprobados',
      heading: 'Acuerdos reales. Ingresos verificados. Casos públicos.',
      body:
        'Cada caso está ligado a un acuerdo completado, a eventos de compartición en la plataforma y a un atleta-estudiante real. Vea exactamente cómo suma el ROI de marca antes de gastar un solo dólar.',
      cta: 'Ver los casos de éxito',
    },
    finalCta: {
      socialProof: '847 atletas ya están ganando',
      title1: '¿Listo para convertir tu',
      title2: 'GPA en oportunidad?',
      body:
        'Únete a cientos de atletas-estudiantes que ya están ganando con GradeUp. Tu excelencia académica merece reconocimiento.',
      ctaAthlete: 'Únete como atleta',
      ctaBrand: 'Asóciate como marca',
      statPaid: 'Más de $127,450 pagados',
      statDeals: '412 acuerdos completados',
      statGpa: 'GPA promedio de 3.72',
    },
  },

  parents: {
    metadata: {
      title: 'NIL para padres — Un primer acuerdo sin riesgo | GradeUp',
      description:
        'La forma más segura de que su atleta-estudiante firme su primer acuerdo NIL. Consentimiento con doble firma, pagos en cuenta custodia, cumplimiento estado por estado y un panel para el padre que firma el permiso.',
    },
    hero: {
      eyebrow: 'Para padres',
      title: 'El primer acuerdo NIL de su atleta-estudiante,',
      titleAccent: 'sin el riesgo.',
      subtitle:
        'Usted es quien realmente firma el permiso. GradeUp es la única plataforma NIL construida para esa realidad: consentimiento con doble firma en cada acuerdo, pagos en cuenta custodia que usted controla y cumplimiento estado por estado gestionado en segundo plano.',
      ctaPrimary: 'Regístrese como padre',
      ctaSecondary: 'Solicite invitación con servicio personalizado',
      supportingNote:
        'Gratis para empezar. Sin tarjeta de crédito. Sin compromiso.',
    },
    problem: {
      eyebrow: 'El problema del padre',
      heading: 'NIL es ruidoso. Casi nada está hecho para usted.',
      subheading:
        'Las plataformas NIL universitarias están hechas para jóvenes de 20 años con un agente. Su atleta tiene 15. Usted es quien lee la letra chica a medianoche. Esto es lo que cambia.',
      oldStoryHeading: 'La vieja historia de NIL',
      oldStoryBody:
        'La mayoría de las plataformas suponen que el atleta toma las decisiones. En la preparatoria, usted toma las decisiones. El consentimiento está escondido, el flujo del dinero es opaco y nadie explica qué es una "ventana de divulgación".',
      oldBullet1:
        'Términos confusos escritos para atletas universitarios',
      oldBullet2:
        'Sin visibilidad de con qué marcas habla su hijo o hija',
      oldBullet3: 'Reglas estatales que cambian cada seis meses',
      oldBullet4: 'Pagos que ignoran al padre por completo',
      productHeading: 'Lo que GradeUp hace diferente',
      productBody:
        'Un panel para padres que refleja la vista del atleta. Doble firma en cada acuerdo. Cuenta custodia de Stripe Connect a nombre de usted. Divulgaciones en español claro para todo.',
      productBullet1:
        'Consentimiento con doble firma — ningún acuerdo se activa sin su firma',
      productBullet2:
        'Pago custodia en una cuenta Stripe a su nombre',
      productBullet3:
        'Divulgaciones compatibles con el estado, presentadas automáticamente',
      productBullet4:
        'Cada acuerdo visible en su panel en tiempo real',
      proofHeading: 'Padres que ya lo usan',
      proofBody:
        'Pasamos a las primeras 20 familias de California por un piloto con servicio personalizado antes de lanzar el producto. Todos los acuerdos se cerraron. Cero problemas de cumplimiento. Cada padre conservó su panel.',
      proofBullet1:
        'Más de 20 familias de California en el piloto personalizado',
      proofBullet2: '7 estados piloto activos hoy',
      proofBullet3:
        'Ningún acuerdo presentado tarde — la automatización los detectó todos',
    },
    features: {
      eyebrow: 'Lo que recibe',
      heading: 'Un panel para padres, no un discurso de ventas.',
      subheading:
        'Todo lo siguiente ya está en el producto. No es una hoja de ruta ni un estado futuro — es la plataforma funcionando, hoy.',
      dualConsentTitle: 'Consentimiento con doble firma',
      dualConsentBody:
        'Cada acuerdo requiere la firma del atleta y la de un padre antes de activarse. Sin zonas grises, sin consentimiento "implícito", sin contratos sorpresa.',
      custodialTitle: 'Pagos en cuenta custodia',
      custodialBody:
        'El dinero entra a una cuenta Stripe Connect a su nombre. Usted decide qué sigue: ahorrar, invertir o entregarle el dinero a su atleta.',
      stateTitle: 'Compatible con el estado, automáticamente',
      stateBody:
        'La plataforma ya conoce las reglas de su estado. Presentación de divulgaciones, categorías prohibidas, verificaciones de edad mínima — todo gestionado sin que usted mueva un dedo.',
      visibilityTitle: 'Visibilidad total',
      visibilityBody:
        'Su panel de padre refleja el panel de su atleta. Cada conversación con una marca, cada acuerdo, cada pago — visible en tiempo real.',
      auditTitle: 'Registro de auditoría a pedido',
      auditBody:
        'Cada firma, cada divulgación, cada pago — guardado para siempre. Usted puede exportar un PDF limpio para la temporada de impuestos o para un abogado con dos clics.',
      ncaaTitle: 'Seguro para la elegibilidad NCAA',
      ncaaBody:
        'Diseñado para proteger la elegibilidad NCAA futura. Sin propiedad intelectual escolar. Sin pagar por jugar. Sin categorías prohibidas. Los entrenadores universitarios futuros se lo agradecerán.',
    },
    quote: {
      text:
        'Firmé el permiso a las 10 p. m. un martes, vi el acuerdo en mi panel el miércoles, y el primer pago llegó a mi Stripe el sábado. Es la distancia más corta entre "esto da miedo" y "esto es real" que he visto en mi vida.',
      attribution: 'Madre, Los Ángeles, CA · Piloto personalizado',
    },
    caseStudies: {
      heading: 'Padres reales. Acuerdos reales. Pagos reales.',
      subheading:
        'Casos de éxito publicados con la voz de un padre o con un expediente verificado por un padre.',
    },
    faq: {
      heading: 'Preguntas que los padres realmente hacen',
      subheading:
        'Seis cosas que todo padre quiere saber antes de firmar.',
      q1: '¿Mi atleta tiene que tener 18 años para firmar un acuerdo?',
      a1: 'No. En la mayoría de los estados piloto, los atletas menores de 18 años pueden firmar con el consentimiento por escrito de un padre o tutor legal, el cual recopilamos y archivamos como parte de cada acuerdo. Texas exige que el atleta tenga al menos 17 años y mantiene el pago en fideicomiso hasta que cumpla 18 — GradeUp gestiona eso automáticamente.',
      q2: '¿A dónde va el dinero realmente?',
      a2: 'A una cuenta custodia de Stripe Connect que usted, como padre, posee y controla. Los pagos se enrutan a su cuenta y usted decide a dónde los manda desde ahí — ahorrar, invertir, regalar o transferir. GradeUp nunca retiene los ingresos de su atleta más allá del corto período entre la finalización del acuerdo y la liberación del pago.',
      q3: '¿Esto es seguro para el reclutamiento NCAA más adelante?',
      a3: 'Sí. GradeUp está diseñado para proteger la elegibilidad NCAA futura. Seguimos las reglas de la asociación atlética de preparatoria de cada estado (que son las que rigen a su atleta hoy) y nunca permitimos propiedad intelectual escolar, pagar por jugar ni categorías prohibidas como apuestas, alcohol o cannabis.',
      q4: '¿Y si no quiero que mi atleta haga un acuerdo en particular?',
      a4: 'Usted aprueba cada acuerdo antes de que se active. Ningún acuerdo existe en el perfil de su atleta hasta que usted, como padre, firme. Si rechaza, el acuerdo nunca ocurre. También puede pausar o retirar el consentimiento en cualquier momento.',
      q5: '¿Qué datos recopilan sobre mi hijo o hija?',
      a5: 'El mínimo para correr un acuerdo cumpliendo la ley: nombre, escuela, deporte, temporada y GPA auto-reportado (opcionalmente verificado mediante revisión de expediente Tier B). No vendemos datos, no cargamos rastreadores de publicidad de terceros en el panel de su atleta, y seguimos prácticas alineadas con COPPA y FERPA. La política de privacidad completa está en /privacy.',
      q6: '¿Cuánto nos cuesta esto?',
      a6: 'Registrarse como padre es gratis. Los atletas también son gratis. GradeUp cobra una pequeña comisión de plataforma solo cuando un acuerdo se cierra — sale del presupuesto de la marca, no de los ingresos de su atleta.',
    },
    ctaBand: {
      heading: '¿Listo para firmar con confianza?',
      subheading:
        'Cree una cuenta de padre gratis. Lo acompañamos en el primer acuerdo.',
      primary: 'Regístrese como padre',
      secondary: 'Ver casos de éxito',
      trustNote: 'Gratis · Sin tarjeta · Alineado con COPPA y FERPA',
    },
  },

  valuation: {
    metadata: {
      title: 'Calculadora de valor NIL — GradeUp HS',
      description:
        'Descubra cuánto vale el NIL de su atleta-estudiante de preparatoria. Estimación instantánea y gratis. Considera deporte, estado, grado, seguidores y GPA.',
    },
    hero: {
      badge: 'Gratis · Estimación en 60 segundos',
      titlePrefix: '¿Cuánto vale su',
      titleAccent: 'atleta-estudiante?',
      titleSuffix: '',
      subtitle:
        'Usted sabe que su hijo o hija es un atleta-estudiante. Creemos que estos rangos tienen sentido. Responda unas pocas preguntas y le daremos un rango de valor NIL honesto — no se necesita correo electrónico para ver su número.',
      trustStateRules: 'Consciente de reglas estatales',
      trustMarketData: 'Datos públicos del mercado',
      trustNoSignup: 'Sin registro para ver la estimación',
    },
    howItWorks: {
      heading: 'Cómo funciona',
      body:
        'Nuestro modelo v1 combina cinco señales del mercado público en un rango calibrado con datos reportados de acuerdos NIL de preparatoria de 2024 a 2026.',
      factor1Title: 'Demanda por deporte',
      factor1Body:
        'El fútbol americano y el baloncesto impulsan la mayor parte del volumen NIL en preparatoria. El baloncesto femenino y los deportes de nicho ganan acuerdos premium dentro de sus segmentos.',
      factor2Title: 'Densidad de marcas por estado',
      factor2Body:
        'California, Texas, Florida, Georgia y Nueva York tienen multiplicadores más altos gracias a las marcas de consumo con sede ahí y a sus mercados mediáticos más grandes.',
      factor3Title: 'Alcance social',
      factor3Body:
        'Rangos de seguidores en escala logarítmica. Los anunciantes pagan más por seguidor a medida que crece la escala — pero los primeros mil importan más para demostrar autenticidad.',
      factor4Title: 'Nivel escolar',
      factor4Body:
        'Los seniors y los atletas rumbo a la universidad tienen un premium porque la activación de marca es a corto plazo. El descuento para los underclassmen refleja un retorno más largo.',
      factor5Title: 'GPA + verificación',
      factor5Body:
        'Nuestro diferenciador: el enfoque atleta-estudiante. Los GPA de 3.9 o más verificados desbloquean patrocinadores de educación y servicios financieros que no tocarían afirmaciones sin verificar.',
      notModeledHeading: 'Lo que no modelamos:',
      notModeledBody:
        'ofertas específicas que usted ya ha recibido, rivalidades regionales, afinidad con marcas locales, la historia personal de su hijo o hija fuera de la cancha. El rango es un punto de partida — GradeUp HS ayuda a verificar credenciales, emparejar con marcas y cerrar acuerdos reales cuando su estado se active.',
      seeCaseStudies: 'Ver casos de acuerdos reales',
      joinWaitlist: 'Unirse a la lista de espera de GradeUp HS',
    },
    trustFooter:
      'Esta calculadora devuelve estimaciones v1 basadas en rangos de acuerdos reportados públicamente. Los números reales de mercado varían mucho. Nada aquí es una oferta, cotización o asesoría legal.',
  },

  caseStudies: {
    metadata: {
      title: 'Casos de éxito — GradeUp HS',
      description:
        'Cómo funcionaron las alianzas reales de atletas-estudiantes. Ingresos verificados, compartidos y ROI de marca de la era de servicio personalizado de GradeUp HS.',
    },
    hero: {
      badge: 'Resultados comprobados de la era de servicio personalizado',
      titlePrefix: 'Casos de éxito.',
      titleAccent: 'Ingresos verificados.',
      subtitle:
        'Cada número que ve aquí está ligado a un acuerdo completado, a un evento de compartición en la plataforma y a un atleta-estudiante real. Los nombres se abrevian por privacidad; la atribución de marca siempre se muestra.',
    },
    filters: {
      all: 'Todos',
      foodBeverage: 'Comida y bebida',
      multiAthlete: 'Varios atletas',
      tierBVerified: 'GPA verificado',
      viralShare: 'Compartido viral',
      parentQuote: 'Voz de padre',
      california: 'California',
    },
    empty: {
      heading: 'Aún no hay casos para este filtro',
      body:
        'Pruebe limpiar el filtro o vuelva pronto — publicamos nuevos casos a medida que se cierran acuerdos.',
      cta: 'Mostrar todos los casos',
    },
  },

  pricing: {
    metadata: {
      title: 'Precios — GradeUp HS-NIL',
      description:
        'Precios NIL transparentes para atletas-estudiantes de preparatoria, sus padres y marcas locales. Sin llamadas de ventas. Sin tarifas ocultas. 8 % de comisión sobre los acuerdos.',
    },
    hero: {
      badge: 'Precios transparentes',
      titlePrefix: 'Precios que no requieren una',
      titleAccent: 'llamada de ventas.',
      subtitle:
        'Publicamos nuestra comisión, el precio de suscripción y lo que está incluido — para que padres, atletas, marcas y oficiales de cumplimiento puedan leer esta página, decidir y registrarse en minutos.',
    },
    tiers: {
      mostPopular: 'El más popular para marcas',
      athletesName: 'Atletas',
      athletesHeadline: 'Gratis para siempre',
      athletesPrice: '$0',
      athletesPriceDetail: 'al mes',
      athletesDescription:
        'Gratis para siempre para atletas-estudiantes de preparatoria. La comisión de plataforma se aplica solo sobre la compensación del acuerdo — usted nunca paga de su bolsillo.',
      athletesCta: 'Crear perfil de atleta',
      athletesFeature1: 'Perfil, emparejamiento y panel gratis',
      athletesFeature2: 'Comisión: 8 % en acuerdos menores a $500',
      athletesFeature3: 'Comisión: 6 % en acuerdos de $500 o más',
      athletesFeature4: 'El custodio padre recibe 92\u201394 % del bruto',
      athletesFeature5: 'Motor de reglas por estado incluido',
      athletesFeature6: 'Flujo de consentimiento parental incluido',
      brandsName: 'Marcas',
      brandsHeadline: 'Sin mínimo mensual',
      brandsPrice: '$0',
      brandsPriceDetail: 'para registrarse',
      brandsDescription:
        'Registro gratis. 8 % de comisión de plataforma por acuerdo completado. Sin mínimos mensuales. Sin costos ocultos.',
      brandsCta: 'Crear cuenta de marca',
      brandsFeature1: 'Registro de marca en menos de dos minutos',
      brandsFeature2:
        '8 % de comisión de plataforma solo en acuerdos completados',
      brandsFeature3: 'Sin mínimo mensual, sin tarifas por puesto',
      brandsFeature4:
        'Verificación de reglas estatales en tiempo real en cada acuerdo',
      brandsFeature5: 'Depósito en custodia al firmar protege a ambas partes',
      brandsFeature6: 'Suba a Brand Plus cuando quiera',
      brandPlusName: 'Brand Plus',
      brandPlusHeadline: 'Para marcas regionales con campañas',
      brandPlusPrice: '$149',
      brandPlusPriceDetail: 'al mes, o $1,490/año (ahorra $298)',
      brandPlusDescription:
        'Desbloquea campañas ilimitadas, emparejamiento prioritario de atletas, un caso de éxito con marca en nuestro sitio y una llamada de incorporación uno a uno. Comisión reducida a 5 % en acuerdos completados.',
      brandPlusCta: 'Comenzar Brand Plus',
      brandPlusFeature1: 'Campañas activas ilimitadas',
      brandPlusFeature2: 'Emparejamiento prioritario de atletas',
      brandPlusFeature3: 'Caso de éxito con marca en gradeup-nil.com',
      brandPlusFeature4: 'Llamada de incorporación uno a uno',
      brandPlusFeature5: '5 % de comisión reducida en acuerdos completados',
      brandPlusFeature6: 'Soporte dedicado (correo + Slack Connect)',
    },
    alwaysFree: {
      heading: 'Siempre gratis',
      body:
        'Tres grupos nunca nos pagan — como política, no solo como precio.',
      alwaysZero: 'Siempre $0',
      stateAd: 'Asociaciones atléticas estatales',
      stateAdDetail:
        '$0 — siempre gratis. No comercial. Portal de cumplimiento de solo lectura.',
      parents: 'Padres',
      parentsDetail: '$0 — nunca una tarifa. Los padres no pagan nunca.',
      schools: 'Preparatorias individuales',
      schoolsDetail:
        '$0 en el año 1 para escuelas de estados piloto. Precios empresariales personalizados para 2027 o más adelante.',
    },
    table: {
      heading: 'Cada función, cada nivel',
      subheading: 'Nada escondido detrás de una llamada empresarial.',
      featureColumn: 'Función',
      athletesColumn: 'Atletas',
      brandsColumn: 'Marcas',
      brandPlusColumn: 'Brand Plus',
      caption:
        'Disponibilidad de funciones entre los niveles Atletas, Marcas y Brand Plus',
    },
    faq: {
      heading: 'Preguntas frecuentes',
      q1: '¿Por qué es gratis para los padres?',
      a1: 'Los padres son los adultos de confianza en el sistema HS-NIL. No les cobramos. Nunca. Los padres no ven una tarifa por registrarse, por aprobar un acuerdo o por actuar como custodio de los ingresos de su atleta. Nuestra comisión sobre los acuerdos de marca paga la plataforma, el cumplimiento y la infraestructura de divulgación estatal.',
      q2: '¿Qué es una "comisión"?',
      a2: 'Una comisión es el porcentaje de un acuerdo completado que la plataforma retiene para cubrir sus costos. La comisión de GradeUp es del 8 % en acuerdos menores a $500 y del 6 % en acuerdos de $500 o más. El 92\u201394 % restante va a la cuenta custodia del padre para beneficio del atleta. Por ejemplo, en un acuerdo de $300, el custodio recibe $276; en uno de $1,000, recibe $940.',
      q3: '¿Cómo sé que mi acuerdo cumple con las reglas?',
      a3: 'Cada acuerdo se valida en tiempo real contra las reglas vigentes del estado del atleta. Nuestro motor de reglas por estado revisa categorías prohibidas (alcohol, tabaco, apuestas, etc.), ventanas de divulgación, topes de monto cuando aplican y alcance del consentimiento. Los acuerdos no conformes se rechazan al crearse, antes de que alguien firme. La asociación atlética estatal recibe un registro de divulgación auditable de cada acuerdo completado en su estado.',
      q4: '¿Qué pasa si la comisión se come demasiado de un acuerdo pequeño?',
      a4: 'Ya lo diseñamos pensando en eso: por debajo de $500 la comisión es del 8 %, así que en un acuerdo de $50 la tarifa es $4. No cobramos mínimos fijos que afecten desproporcionadamente a los acuerdos pequeños. Si un acuerdo falla la validación de reglas estatales, no se cobra tarifa porque el acuerdo no ocurrió.',
      q5: '¿Les cobran a las escuelas?',
      a5: 'No. Las preparatorias individuales pagan $0 en el año 1 de un estado piloto. A partir de 2027 puede existir un precio empresarial personalizado para escuelas que busquen reportes o integraciones avanzadas, pero hoy no hay tarifa.',
      q6: '¿Les cobran a la asociación atlética estatal?',
      a6: 'No. El portal de cumplimiento para el State AD siempre es gratis. Es un producto de bien público no comercial. Las asociaciones atléticas estatales obtienen visibilidad de solo lectura sobre cada acuerdo en su estado sin costo.',
      q7: '¿Hay alguna tarifa de solicitud?',
      a7: 'No. No cobramos a atletas, padres ni marcas una tarifa de solicitud para usar la plataforma. No hay tarifa por crear un perfil, navegar atletas, navegar marcas ni publicar una oportunidad.',
      q8: '¿Y con Brand Plus — puedo cancelar?',
      a8: 'Sí. Brand Plus es mes a mes o anual. Cancele cuando quiera; la cancelación surte efecto al final del ciclo de facturación vigente. No prorrateamos reembolsos a la mitad del ciclo. Los términos completos están en la página de términos de suscripción.',
    },
    finalCta: {
      heading: 'Empiece gratis. Sin llamada de ventas.',
      body:
        'Cree su cuenta hoy. Revise los términos. Corra su primer acuerdo esta semana.',
      primary: 'Crear cuenta de marca',
      secondary: 'Crear perfil de atleta',
      disclaimer:
        'No cobramos tarifas de solicitud. No cobramos a los atletas. Los padres nunca ven una tarifa. Nuestra comisión paga la plataforma, el cumplimiento y la infraestructura de divulgación estatal.',
    },
  },

  hsLanding: {
    metadata: {
      title: 'GradeUp HS — Nombre, imagen y semejanza para atletas de preparatoria',
      description:
        'La primera plataforma NIL hecha para atletas-estudiantes de preparatoria. GPA verificado, consentimiento parental y acuerdos que cumplen con el estado.',
    },
    phase: 'Fase 0 — Lista de espera',
    title: 'NIL para el freshman con 3.9 de GPA.',
    body:
      'GradeUp está construyendo la primera plataforma NIL diseñada para atletas de preparatoria y los padres que los guían. Calificaciones verificadas. Consentimiento parental incorporado. Compatible con el estado por diseño.',
    states:
      'Activo en 6 estados: California, Florida, Georgia, Illinois, Nueva Jersey y Nueva York.',
    verifiedGpaTitle: 'GPA verificado',
    verifiedGpaBody:
      'Auto-reportado hoy. Verificado por la institución mañana. Cada afirmación lleva etiqueta.',
    parentsTitle: 'Padres primero',
    parentsBody:
      'Doble firma. Pagos en cuenta custodia. Un panel real para quienes firman el permiso.',
    stateTitle: 'Cumple con el estado',
    stateBody:
      'Motor de reglas por estado que gestiona ventanas de divulgación, categorías prohibidas y requisitos de agentes automáticamente.',
  },
};
