/*
 * Postura correcta y prevención de lesiones de cada ejercicio.
 * c: puntos clave [marca, texto]. La marca se numera sobre la figura:
 *    una articulación (head, sh, el, ha, wrist, hip, kn, ft, toe) o zona (back, lowback, core, chest, glute, shoulder),
 *    o una línea de alineación "a-b" (p. ej. "toe-head" = cuerpo recto de pies a cabeza).
 * s: pautas para no lesionarse.
 */
const FAMILY_SAFE = {
  push_h: ['Si te molesta la muñeca, apoya sobre los puños o sobre unas asas.', 'Para si notas dolor punzante en el hombro (el esfuerzo muscular es normal, el pinchazo no).'],
  push_v: ['Calienta muñecas y hombros antes de cargar peso sobre las manos.', 'Ten siempre una salida segura: aprende a bajar del pino girando a un lado.'],
  dips: ['No bajes más allá de donde el hombro se sienta cómodo: con 90° en el codo es suficiente.', 'Mantén los hombros lejos de las orejas en todo momento.'],
  pull_v: ['Empieza cada repetición activando las escápulas (hombros abajo), nunca colgado pasivo del todo.', 'Baja controlado: dejarse caer castiga codos y hombros.'],
  pull_h: ['Comprueba que el apoyo (barra, mesa, puerta) es estable antes de colgarte.', 'Tira con la espalda, no con el cuello: la cabeza sigue la línea del cuerpo.'],
  squat: ['Rodillas en la dirección de las puntas de los pies; que no se vayan hacia dentro.', 'Baja solo hasta donde mantengas la espalda neutra y los talones apoyados.'],
  hinge: ['Mueve desde la cadera con la espalda neutra; no redondees la zona lumbar.', 'Aprieta glúteos arriba en lugar de arquear la espalda.'],
  calves: ['Movimiento lento y completo, sin rebotes.', 'Apóyate en una pared si pierdes el equilibrio.'],
  core_a: ['Mantén la zona lumbar pegada al suelo o neutra; si se arquea, reduce la dificultad.', 'Respira de forma continua, no bloquees la respiración.'],
  core_p: ['Movimientos controlados y sin dolor lumbar.', 'Mira al suelo para mantener el cuello alineado.'],
  skill: ['Practica con un cojín o colchoneta delante y sin prisas.', 'Para la serie en cuanto pierdas la forma: las habilidades se aprenden con calidad, no con cansancio.'],
  cond: ['Aterriza suave, con las rodillas ligeramente flexionadas.', 'Baja el ritmo antes que perder la técnica.'],
};

const KEYS = {
  /* Empuje horizontal */
  wall_pushup: { c: [['toe-head', 'Cuerpo recto de talones a cabeza'], ['el', 'Codos a unos 45° del tronco'], ['sh', 'Hombros lejos de las orejas']], s: ['Pies bien apoyados para no resbalar.'] },
  incline_pushup: { c: [['toe-head', 'Línea recta de talones a cabeza'], ['el', 'Codos a 45°, no abiertos en cruz'], ['chest', 'El pecho baja hasta el borde del apoyo']], s: ['Apoya la silla contra la pared para que no se deslice.'] },
  knee_pushup: { c: [['kn-head', 'Recto de rodillas a cabeza, sin doblar la cadera'], ['el', 'Codos a 45°'], ['ha', 'Manos bajo los hombros o algo más abiertas']], s: ['Pon un cojín bajo las rodillas.'] },
  pushup: { c: [['toe-head', 'Cuerpo en bloque: ni cadera hundida ni en pico'], ['el', 'Codos a 45° del tronco'], ['ha', 'Manos bajo los hombros, dedos abiertos'], ['core', 'Abdomen y glúteos apretados']], s: ['Si se hunde la cadera, pasa a flexiones inclinadas.'] },
  diamond_pushup: { c: [['el', 'Codos pegados al cuerpo, hacia atrás'], ['ha', 'Manos juntas bajo el esternón'], ['toe-head', 'Cuerpo recto']], s: ['Exige mucho a muñecas y codos: no lo hagas con molestias.'] },
  decline_pushup: { c: [['toe-head', 'Cuerpo recto: la cadera no cae'], ['el', 'Codos a 45°'], ['head', 'Cabeza neutra, mirando al suelo']], s: ['Cuanto más alto el apoyo de los pies, más carga en el hombro: sube poco a poco.'] },
  ring_pushup: { c: [['ha', 'Anillas pegadas al cuerpo al bajar'], ['toe-head', 'Cuerpo recto'], ['sh', 'Arriba, empuja y separa las escápulas']], s: ['Anillas a pocos cm del suelo para empezar.'] },
  archer_pushup: { c: [['el', 'Solo se dobla el brazo que trabaja'], ['toe-head', 'Cadera estable, sin rotar'], ['ha', 'Manos muy abiertas']], s: ['Calienta bien los hombros: el brazo estirado queda en posición exigente.'] },
  pseudo_planche_pushup: { c: [['sh', 'Hombros por delante de las manos todo el rato'], ['ha', 'Manos a la altura de la cintura, dedos hacia fuera'], ['toe-head', 'Cuerpo recto y abdomen firme']], s: ['Mucha carga en muñecas: calienta y progresa despacio.'] },
  one_arm_pushup_incline: { c: [['ha', 'Mano bajo el pecho'], ['toe-head', 'Tronco sin rotar'], ['ft', 'Pies muy abiertos']], s: ['Empieza con un apoyo alto (mesa) y baja la altura con las semanas.'] },
  one_arm_pushup: { c: [['ha', 'Mano bajo el pecho'], ['toe-head', 'Cuerpo recto, sin girar'], ['ft', 'Pies abiertos para estabilizar']], s: ['No la intentes sin dominar la versión inclinada.'] },

  /* Empuje vertical */
  pike_pushup: { c: [['hip', 'Cadera alta, forma de V invertida'], ['head', 'La cabeza baja por delante de las manos'], ['el', 'Codos hacia atrás, no abiertos']], s: ['Baja la cabeza despacio hasta casi rozar el suelo.'] },
  elevated_pike_pushup: { c: [['back', 'Tronco lo más vertical posible'], ['head', 'Cabeza por delante de las manos'], ['el', 'Codos hacia atrás']], s: ['Silla estable y contra la pared.'] },
  wall_handstand: { c: [['ha-toe', 'Cuerpo alineado: sin espalda en plátano'], ['sh', 'Empuja el suelo: hombros hacia las orejas'], ['core', 'Glúteos y abdomen apretados']], s: ['Sube caminando con los pies por la pared y baja igual de controlado.', 'Despeja el espacio alrededor.'] },
  wall_hspu_partial: { c: [['head', 'Bajada corta y controlada hasta el cojín'], ['el', 'Codos hacia delante, no abiertos'], ['core', 'Cuerpo firme']], s: ['Usa un cojín bajo la cabeza como tope.'] },
  wall_hspu: { c: [['head', 'La cabeza forma un triángulo con las manos'], ['el', 'Codos hacia delante'], ['ha-toe', 'Cuerpo alineado']], s: ['Nunca golpees el suelo con la cabeza: si no puedes frenar, vuelve a la versión parcial.'] },
  deficit_hspu: { c: [['head', 'La cabeza baja por debajo de las manos'], ['el', 'Codos controlados'], ['ha', 'Apoyos firmes y estables']], s: ['Solo con un dominio total de la versión normal.'] },
  handstand: { c: [['ha-toe', 'Línea recta de manos a pies'], ['sh', 'Hombros empujando hacia arriba'], ['ha', 'Corrige el equilibrio con los dedos']], s: ['Aprende a salir girando a un lado (media rueda) antes de practicar sin pared.'] },

  /* Fondos */
  bench_dip_bent: { c: [['back', 'Espalda rozando la silla'], ['el', 'Codos hacia atrás, máximo 90°'], ['sh', 'Hombros abajo, lejos de las orejas']], s: ['Silla estable contra la pared.', 'Si notas el hombro delante, reduce el rango.'] },
  bench_dip: { c: [['back', 'Cadera cerca de la silla'], ['el', 'Codos a 90° como máximo'], ['sh', 'Hombros abajo y atrás']], s: ['No bajes más de lo cómodo para el hombro.'] },
  dip_negative: { c: [['el', 'Baja en 3-5 s hasta 90° de codo'], ['sh', 'Hombros lejos de las orejas'], ['back', 'Tronco ligeramente inclinado']], s: ['Si usas sillas, que sean robustas y no se muevan.'] },
  dip: { c: [['el', 'Hombro a la altura del codo abajo'], ['sh', 'Hombros abajo, pecho abierto'], ['back', 'Ligera inclinación hacia delante']], s: ['Evita bajar en exceso si tienes historial de hombro.'] },
  ring_dip: { c: [['ha', 'Anillas pegadas al cuerpo'], ['el', 'Codos hacia atrás'], ['sh', 'Hombros estables y abajo']], s: ['Domina antes el soporte en anillas 30 s.'] },
  weighted_dip: { c: [['el', 'Mismo rango que sin peso'], ['sh', 'Hombros abajo'], ['back', 'Mochila pegada a la espalda']], s: ['Sube el peso poco a poco (2-5 kg).'] },

  /* Tracción vertical */
  prone_pulldown: { c: [['el', 'Codos hacia las costillas'], ['back', 'Junta las escápulas al final'], ['head', 'Mira al suelo, cuello largo']], s: ['Eleva el pecho poco: no fuerces la zona lumbar.'] },
  dead_hang: { c: [['sh', 'Hombros ligeramente activos'], ['ha', 'Agarre completo con el pulgar'], ['ft', 'Piernas juntas, sin balanceo']], s: ['Baja con cuidado: no saltes desde arriba.'] },
  band_pulldown: { c: [['el', 'Codos hacia las costillas'], ['chest', 'Pecho alto'], ['sh', 'Hombros abajo al tirar']], s: ['Revisa que la banda esté bien anclada antes de tirar.'] },
  scap_pull: { c: [['el', 'Codos siempre estirados'], ['sh', 'Baja los hombros, aléjalos de las orejas'], ['chest', 'El pecho sube un poco']], s: ['Movimiento corto y controlado.'] },
  pullup_negative: { c: [['ha', 'Empieza con la barbilla sobre la barra'], ['el', 'Baja en 3-5 s, controlando hasta el final'], ['sh', 'Hombros activos abajo']], s: ['Usa una silla para subir, no saltes con impulso.'] },
  band_pullup: { c: [['kn', 'Banda bien colocada bajo rodilla o pie'], ['el', 'Codos hacia los bolsillos'], ['head', 'Barbilla por encima de la barra']], s: ['Sujeta la banda al subir y al bajar para que no salte.'] },
  chinup: { c: [['ha', 'Palmas hacia ti, a la anchura de hombros'], ['el', 'Codos hacia abajo y delante'], ['chest', 'Pecho hacia la barra']], s: ['Estira los brazos abajo sin relajar del todo los hombros.'] },
  pullup: { c: [['sh', 'Empieza bajando los hombros'], ['el', 'Codos hacia los bolsillos'], ['head', 'Barbilla sobre la barra'], ['ft', 'Piernas juntas, sin patear']], s: ['Baja controlado: el codo sufre cuando te dejas caer.'] },
  lsit_pullup: { c: [['kn', 'Piernas estiradas a 90°'], ['el', 'Codos hacia abajo'], ['core', 'Abdomen firme toda la serie']], s: ['Si bajan las piernas, termina la serie.'] },
  archer_pullup: { c: [['el', 'Solo tira un brazo; el otro asiste'], ['sh', 'Hombros abajo'], ['core', 'Cuerpo sin girar']], s: ['Exigente para el codo: progresa despacio.'] },
  weighted_pullup: { c: [['el', 'Mismo recorrido completo'], ['back', 'Mochila pegada'], ['sh', 'Hombros activos']], s: ['Añade peso en pasos pequeños.'] },
  muscle_up: { c: [['hip', 'Tira hacia la cadera, no hacia la barbilla'], ['chest', 'Pecho por encima de la barra'], ['el', 'Los dos codos pasan a la vez']], s: ['Requiere 10+ dominadas y 15+ fondos. Practica la transición en barra baja.'] },

  /* Tracción horizontal */
  door_row: { c: [['ft-head', 'Cuerpo recto inclinado hacia atrás'], ['el', 'Codos pegados al cuerpo'], ['back', 'Junta las escápulas']], s: ['Puerta cerrada y con el pestillo; tira hacia el lado que la cierra.'] },
  table_row: { c: [['kn-head', 'Recto de rodillas a cabeza'], ['chest', 'Pecho hacia el borde de la mesa'], ['el', 'Codos a 45°']], s: ['Mesa muy estable: prueba antes con tu peso que no vuelca.'] },
  australian_row_bent: { c: [['kn-head', 'Cadera alineada, sin caer'], ['back', 'Junta las escápulas arriba'], ['head', 'Cuello en línea con el cuerpo']], s: ['Barra a la altura de la cadera y bien fijada.'] },
  australian_row: { c: [['ft-head', 'Cuerpo recto de talones a cabeza'], ['chest', 'El pecho toca la barra'], ['el', 'Codos a 45°']], s: ['Glúteos apretados para que no caiga la cadera.'] },
  ring_row: { c: [['ft-head', 'Cuerpo recto'], ['el', 'Codos pegados, palmas hacia dentro'], ['back', 'Escápulas juntas arriba']], s: ['Correas bien ancladas antes de cargar peso.'] },
  australian_row_elevated: { c: [['ft-head', 'Cuerpo totalmente horizontal'], ['chest', 'Pecho a la barra'], ['core', 'Abdomen firme']], s: ['Pies bien apoyados en una superficie estable.'] },
  archer_row: { c: [['el', 'Solo tira un brazo'], ['ft-head', 'Cadera sin rotar'], ['back', 'Escápula del brazo que trabaja hacia atrás']], s: ['Progresa desde el remo normal con pies elevados.'] },
  tuck_front_lever_row: { c: [['back', 'Espalda horizontal'], ['el', 'Brazos casi estirados al inicio'], ['kn', 'Rodillas pegadas al pecho']], s: ['Solo si aguantas 15 s de front lever agrupado.'] },

  /* Sentadilla */
  chair_squat: { c: [['glute', 'Cadera atrás hasta rozar la silla'], ['kn', 'Rodillas en la línea de los pies'], ['back', 'Espalda neutra, pecho alto']], s: ['No te dejes caer en la silla: rózala y sube.'] },
  squat: { c: [['ft', 'Talones pegados al suelo'], ['kn', 'Rodillas hacia las puntas de los pies'], ['back', 'Espalda neutra, pecho alto'], ['hip', 'Cadera al menos a la altura de la rodilla']], s: ['Si se levantan los talones, abre un poco más los pies.'] },
  pause_squat: { c: [['hip', 'Pausa 3 s abajo sin rebotar'], ['kn', 'Rodillas hacia fuera'], ['back', 'Mantén la tensión y la espalda neutra']], s: ['Respira antes de bajar y aguanta el abdomen firme.'] },
  split_squat: { c: [['kn', 'Rodilla delantera sobre el tobillo'], ['back', 'Tronco erguido'], ['ft', 'Peso en el talón delantero']], s: ['La rodilla de atrás baja suave, sin golpear el suelo.'] },
  bulgarian_squat: { c: [['kn', 'Rodilla delantera alineada con el pie'], ['ft', 'Pie delantero lo bastante adelantado'], ['back', 'Tronco ligeramente inclinado']], s: ['Silla estable contra la pared.'] },
  jump_squat: { c: [['kn', 'Aterriza con rodillas flexionadas'], ['ft', 'Aterrizaje suave y silencioso'], ['back', 'Espalda neutra']], s: ['Evítalo con molestias de rodilla o sobrepeso alto.'] },
  cossack_squat: { c: [['ft', 'Talón de la pierna flexionada en el suelo'], ['kn', 'Rodilla hacia la punta del pie'], ['chest', 'Pecho alto']], s: ['Baja solo hasta donde te permita la movilidad.'] },
  box_pistol: { c: [['kn', 'Rodilla alineada, sin irse hacia dentro'], ['ha', 'Brazos al frente de contrapeso'], ['glute', 'Siéntate despacio en la caja']], s: ['Empieza con una caja alta.'] },
  pistol_squat: { c: [['ft', 'Talón de apoyo pegado al suelo'], ['kn', 'Rodilla alineada'], ['toe', 'Pierna libre estirada sin tocar el suelo']], s: ['Sin rebotes abajo: castigan la rodilla.'] },
  shrimp_squat: { c: [['kn', 'Rodilla de apoyo alineada'], ['back', 'Tronco inclinado hacia delante'], ['ft', 'Talón apoyado']], s: ['Pon un cojín donde toca la rodilla de atrás.'] },

  /* Cadena posterior y gemelos */
  glute_bridge: { c: [['kn-sh', 'Arriba: rodillas, cadera y hombros en línea'], ['glute', 'Aprieta glúteos 2 s'], ['ft', 'Empuja con los talones']], s: ['No subas arqueando la lumbar: el glúteo hace el trabajo.'] },
  single_leg_bridge: { c: [['hip', 'Cadera nivelada, sin inclinarse'], ['glute', 'Empuja con el glúteo'], ['ft', 'Talón de apoyo firme']], s: ['Si notas el femoral calambre, acerca el pie al glúteo.'] },
  sl_rdl: { c: [['toe-head', 'Espalda y pierna libre en una línea'], ['kn', 'Rodilla de apoyo un poco flexionada'], ['hip', 'Cadera cuadrada al suelo']], s: ['Apóyate con una mano en la pared al principio.'] },
  single_leg_hip_thrust: { c: [['sh', 'Espalda alta apoyada en el borde'], ['glute', 'Bloquea con el glúteo arriba'], ['head', 'Mentón ligeramente al pecho']], s: ['Sofá o banco que no se deslice.'] },
  nordic_negative: { c: [['kn-head', 'Recto de rodillas a cabeza'], ['ha', 'Manos listas para frenar'], ['ft', 'Talones bien sujetos']], s: ['Cojín bajo las rodillas y bajada lo más lenta posible.'] },
  nordic_curl: { c: [['kn-head', 'Cadera extendida, cuerpo recto'], ['ft', 'Talones bien anclados'], ['kn', 'Rodillas protegidas con cojín']], s: ['Muy exigente para el femoral: haz pocas repeticiones al principio.'] },
  calf_raise: { c: [['ft', 'Sube lo más alto posible'], ['toe-head', 'Cuerpo erguido'], ['kn', 'Rodillas estiradas sin bloquear']], s: ['Pausa arriba y baja lento.'] },
  sl_calf_raise: { c: [['ft', 'Baja el talón por debajo del escalón'], ['ha', 'Apóyate para el equilibrio'], ['kn', 'Rodilla estirada']], s: ['Escalón estable y sin bordes resbaladizos.'] },

  /* Core */
  dead_bug: { c: [['lowback', 'Lumbar pegada al suelo'], ['ha', 'Brazo contrario a la pierna'], ['kn', 'Extiende despacio y vuelve']], s: ['Si la lumbar se despega, no estires tanto.'] },
  plank: { c: [['toe-head', 'Línea recta de talones a cabeza'], ['el', 'Codos bajo los hombros'], ['glute', 'Glúteos apretados'], ['core', 'Ombligo hacia dentro']], s: ['Cuando la cadera caiga, termina la serie.'] },
  hollow_tuck: { c: [['lowback', 'Lumbar pegada al suelo'], ['kn', 'Rodillas hacia el pecho'], ['sh', 'Hombros despegados']], s: ['Respira de forma continua.'] },
  lying_leg_raise: { c: [['lowback', 'Lumbar pegada'], ['kn', 'Piernas estiradas y juntas'], ['ft', 'Baja lento sin tocar el suelo']], s: ['Pon las manos bajo los glúteos si se despega la lumbar.'] },
  hollow_hold: { c: [['lowback', 'Lumbar SIEMPRE en el suelo'], ['ha', 'Brazos estirados detrás de la cabeza'], ['ft', 'Piernas bajas, juntas y estiradas']], s: ['Si se arquea la espalda, sube las piernas o encógelas.'] },
  hanging_knee_raise: { c: [['hip', 'Bascula la pelvis hacia arriba'], ['kn', 'Rodillas al pecho'], ['sh', 'Hombros activos, sin balanceo']], s: ['Baja controlado para no balancearte.'] },
  tuck_lsit: { c: [['el', 'Brazos bloqueados'], ['sh', 'Hombros hacia abajo'], ['kn', 'Rodillas al pecho']], s: ['Usa libros o paralelas si las muñecas molestan en el suelo.'] },
  hanging_leg_raise: { c: [['ft', 'Piernas juntas y estiradas'], ['hip', 'Sube a 90° o más'], ['sh', 'Sin balanceo']], s: ['Si te balanceas, para un segundo abajo.'] },
  lsit: { c: [['kn', 'Piernas estiradas paralelas al suelo'], ['el', 'Brazos bloqueados'], ['sh', 'Hombros abajo, cuello largo']], s: ['Calienta muñecas y prueba sobre paralelas.'] },
  toes_to_bar: { c: [['ft', 'Puntas a la barra controladas'], ['sh', 'Empuja la barra hacia abajo'], ['hip', 'La cadera sube']], s: ['Exigente para el agarre: tiza o toalla si sudas.'] },
  dragon_flag: { c: [['sh-toe', 'Cuerpo recto como una tabla'], ['sh', 'Solo la espalda alta apoyada'], ['ha', 'Agarre firme detrás de la cabeza']], s: ['Empieza con negativas y rodillas flexionadas.'] },
  bird_dog: { c: [['ha-toe', 'Brazo y pierna contrarios en línea con la espalda'], ['back', 'Espalda plana como una mesa'], ['hip', 'Cadera sin rotar']], s: ['Pausa 2 s arriba; nada de prisas.'] },
  superman: { c: [['head', 'Mira al suelo'], ['glute', 'Aprieta glúteos'], ['lowback', 'Eleva poco y sin dolor']], s: ['Si molesta la lumbar, levanta solo brazos o solo piernas.'] },
  side_plank: { c: [['ft-head', 'Cuerpo recto de pies a cabeza'], ['el', 'Codo bajo el hombro'], ['hip', 'Cadera alta']], s: ['Rodillas en el suelo para la versión fácil.'] },
  arch_hold: { c: [['ha-toe', 'Brazos y piernas estirados'], ['glute', 'Glúteos apretados'], ['head', 'Cuello neutro']], s: ['Sin dolor lumbar; si aparece, reduce la altura.'] },

  /* Habilidades */
  crow: { c: [['kn', 'Rodillas apoyadas en los brazos'], ['head', 'Mira al frente, no a los pies'], ['ha', 'Dedos abiertos y activos']], s: ['Cojín delante por si caes.'] },
  tuck_planche: { c: [['el', 'Brazos bloqueados'], ['sh', 'Hombros por delante de las manos'], ['back', 'Espalda redondeada']], s: ['Calienta muñecas a fondo.'] },
  tuck_front_lever: { c: [['back', 'Espalda paralela al suelo'], ['el', 'Brazos estirados'], ['kn', 'Rodillas al pecho']], s: ['Sal del ejercicio controlado, sin soltar de golpe.'] },

  /* Acondicionamiento */
  jumping_jack: { c: [['ft', 'Aterriza sobre la parte delantera del pie'], ['ha', 'Brazos completos por encima de la cabeza'], ['kn', 'Rodillas suaves']], s: ['Sustitúyelo por pasos laterales si tienes molestias.'] },
  high_knees: { c: [['kn', 'Rodilla a la altura de la cadera'], ['back', 'Tronco erguido'], ['ft', 'Apoyo en antepié']], s: ['Marcha sin saltar si es bajo impacto.'] },
  mountain_climber: { c: [['sh', 'Hombros sobre las manos'], ['hip', 'Cadera baja'], ['kn', 'Rodilla al pecho']], s: ['Más lento si la cadera sube.'] },
  burpee: { c: [['toe-head', 'Plancha recta, sin hundir la cadera'], ['kn', 'Aterriza suave del salto'], ['back', 'Agáchate con la espalda neutra']], s: ['Quita el salto si buscas bajo impacto.'] },
  burpee_pushup: { c: [['toe-head', 'Flexión con el cuerpo recto'], ['kn', 'Aterrizaje suave'], ['back', 'Espalda neutra al agacharte']], s: ['No dejes caer el pecho al suelo.'] },
};

// Calentamiento y estiramientos: figura y puntos clave
const MOB_KEYS = {
  wrists: { fig: 'wrist_rock', c: [['ha', 'Manos bajo los hombros'], ['sh', 'Balancea suave adelante y atrás']] },
  arm_circles: { c: [['ha', 'Círculos amplios y lentos'], ['sh', 'Hombros relajados']] },
  cat_cow: { c: [['back', 'Redondea y arquea la espalda despacio'], ['head', 'La cabeza acompaña']] },
  scap: { fig: 'scap_pushup', c: [['sh', 'Junta y separa las escápulas'], ['el', 'Codos estirados']] },
  jacks: { c: [['ft', 'Saltos suaves'], ['ha', 'Brazos arriba']] },
  march: { c: [['kn', 'Rodillas a la cadera'], ['back', 'Tronco erguido']] },
  leg_swings: { c: [['toe', 'Balanceo amplio y controlado'], ['back', 'Tronco quieto']] },
  hip_circles: { fig: 'hip_circles', c: [['hip', 'Círculos amplios de cadera'], ['kn', 'Rodillas suaves']] },
  deep_squat: { c: [['ft', 'Talones en el suelo'], ['kn', 'Codos empujan rodillas hacia fuera']] },
  bridge_warm: { c: [['glute', 'Aprieta glúteos arriba'], ['ft', 'Empuja con talones']] },
  chest_stretch: { c: [['chest', 'Abre el pecho'], ['ha', 'Brazos atrás sin forzar']] },
  child_pose: { c: [['glute', 'Glúteos a los talones'], ['ha', 'Brazos estirados al frente']] },
  hamstring: { c: [['back', 'Espalda larga, inclina desde la cadera'], ['kn', 'Rodillas estiradas sin bloquear']] },
  quad: { c: [['kn', 'Rodilla apuntando al suelo'], ['glute', 'Glúteo apretado, cadera adelante']] },
  hinge_stretch: { c: [['hip', 'Inclina desde la cadera'], ['kn', 'Rodillas ligeramente flexionadas']] },
  lat_hang: { fig: 'lat_stretch', desc: 'Manos en el respaldo de una silla, en la pared o colgado de la barra: lleva la cadera atrás y deja caer el pecho.', c: [['back', 'Lleva la cadera atrás'], ['ha', 'Brazos estirados']] },
  breathing: { fig: 'breathing', c: [['core', 'El abdomen sube al inhalar'], ['chest', 'El pecho apenas se mueve']] },
  hip_flexor: { fig: 'hip_flexor', c: [['hip', 'Empuja la cadera adelante'], ['kn2', 'Rodilla de atrás sobre un cojín'], ['back', 'Tronco erguido, sin arquear']] },
  calf_stretch: { fig: 'calf_stretch', c: [['ft2', 'Talón de atrás en el suelo'], ['kn2', 'Rodilla de atrás estirada']] },
  shoulder_stretch: { fig: 'shoulder_stretch', c: [['el', 'Brazo cruzado a la altura del pecho'], ['sh', 'Hombro abajo']] },
};

// Une los puntos clave con la base de datos y las figuras
(() => {
  for (const ex of EXERCISES) {
    const k = KEYS[ex.id];
    if (k) { ex.cues = k.c; ex.safe = (k.s || []).concat(FAMILY_SAFE[ex.fam] || []); }
    else { ex.cues = ex.cues.map(t => (Array.isArray(t) ? t : [null, t])); ex.safe = FAMILY_SAFE[ex.fam] || []; }
  }
  Object.assign(MOBILITY, {
    hip_flexor: { n: 'Flexor de cadera en zancada', secs: 40, desc: 'Rodilla atrás apoyada, avanza la cadera hasta notar estiramiento delante del muslo. 20 s por lado.' },
    calf_stretch: { n: 'Gemelo en pared', secs: 30, desc: 'Manos en la pared, una pierna atrás estirada con el talón en el suelo. 15 s por lado.' },
    shoulder_stretch: { n: 'Hombro cruzado', secs: 30, desc: 'Lleva un brazo cruzado sobre el pecho y sujétalo con el otro. 15 s por lado.' },
  });
  for (const id in MOBILITY) {
    const k = MOB_KEYS[id];
    if (k) { if (k.fig) MOBILITY[id].fig = k.fig; if (k.desc) MOBILITY[id].desc = k.desc; MOBILITY[id].cues = k.c; }
    MOBILITY[id].cues = MOBILITY[id].cues || [];
  }
})();

// Convierte los puntos clave en marcas numeradas para la figura
function cueMarks(cues) {
  return (cues || []).map((c, i) => {
    const m = c[0];
    if (!m) return null;
    return m.includes('-') ? { line: m.split('-'), n: i + 1 } : { j: m, n: i + 1 };
  }).filter(Boolean);
}
