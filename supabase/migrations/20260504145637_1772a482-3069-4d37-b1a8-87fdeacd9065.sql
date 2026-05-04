UPDATE public.onboarding_pages
SET blocks = blocks || jsonb_build_array(
  jsonb_build_object('type', 'divider'),
  jsonb_build_object(
    'type', 'table',
    'title', 'Lingo',
    'columns', jsonb_build_array('Term', 'Definition'),
    'rows', jsonb_build_array(
      jsonb_build_array('Locations', 'We call the spaces where we meet "Locations." Our locations are 515 (five-fifteen), Cumberland, and Trilith (often shortened to CBL and TRL respectively).'),
      jsonb_build_array('House', 'How we refer to all locations as a whole, "our House."'),
      jsonb_build_array('Gatherings', 'Not service, because when we come together in worship it''s more about gathering than it is about serving.'),
      jsonb_build_array('Environment', 'A space within a location (i.e. bloom, Passion Kids, Passion Students).'),
      jsonb_build_array('bloom', 'A space for our 6 weeks to Pre-K.'),
      jsonb_build_array('Oval, Atrium, Intersection', 'The gathering space before entering the auditorium at 515, Cumberland, and Trilith respectively.'),
      jsonb_build_array('Bump Out Wall', 'The long wall on the right side of the main entrance hallway at 515 with rotating art + messaging.'),
      jsonb_build_array('Points', 'Your Sunday/event contact. Use this person as a helpful resource!'),
      jsonb_build_array('Call Time', 'The time you''re expected to be in the building ready to go.'),
      jsonb_build_array('Front of House', 'The space in the aud. where Production produces Gatherings from.'),
      jsonb_build_array('Back of House', 'Any space behind the stage.'),
      jsonb_build_array('Dolly', 'The camera on wheels, usually located in the middle or back of the room.'),
      jsonb_build_array('Stage Left / Right', 'The left or right side of the room when looking at the room from the point of view of someone on stage.'),
      jsonb_build_array('House Left / Right', 'The left or right side of the room when looking at the room from the point of view facing the stage.'),
      jsonb_build_array('Run Sheet', 'The contents and order of the Gathering/event.'),
      jsonb_build_array('Production Meeting', 'A pre-gathering meeting where the producer goes through the runsheet.'),
      jsonb_build_array('Planning Center Online', 'The tool we use for scheduling Sunday Gathering. This also houses our run sheets.'),
      jsonb_build_array('Connect', 'The tool we use for scheduling additional serving opportunities. We might also use this as an RSVP system for House events.')
    )
  )
)
WHERE slug = 'process';