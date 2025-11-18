-- Dades de prova per a la base de dades

-- Inserir exercicis de prova
INSERT INTO exercises (name, description, difficulty, tren) VALUES
('Flexions', 'Exercici de push-ups per enfortir pit i braços', 'medium', 'superior'),
('Abdominals', 'Exercici per enfortir els abdominals', 'medium', 'superior'),
('Esquats', 'Exercici de squats per cames', 'easy', 'inferior'),
('Burpees', 'Exercici complet de cardio i força', 'hard', 'superior'),
('Jumping Jacks', 'Exercici de cardio', 'easy', 'inferior');

-- Inserir rutines de prova
INSERT INTO routines (id, room_code, is_public, status, num_participants, duration) VALUES
(1, 'SALA001', true, 'waiting', 4, 45),
(2, 'SALA002', false, 'in-progress', 2, 30),
(3, 'SALA003', true, 'finished', 6, 60);

-- Inserir performances de prova
INSERT INTO performances (user_id, routine_id, exercise_id, reps, score, won) VALUES
(1, 1, 1, 20, 85.5, true),
(2, 1, 1, 15, 75.0, false),
(3, 2, 3, 25, 92.5, true),
(4, 3, 4, 30, 88.0, true);

-- Inserir resultats globals de prova
INSERT INTO resultats_globals (user_id, repeticions_totals, data_record) VALUES
(1, 150, NOW()),
(2, 120, NOW()),
(3, 200, NOW()),
(4, 175, NOW());