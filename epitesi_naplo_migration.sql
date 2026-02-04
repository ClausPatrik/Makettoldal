-- Engedd, hogy egy maketthez TÖBB építési napló (epitesi_tippek_naplo) tartozhasson
-- Jelenleg a dumpban van egy UNIQUE kulcs a makett_id-n (csak 1 napló / makett).
-- Ezt dobd le, és legyen sima index.

ALTER TABLE `epitesi_tippek_naplo`
  DROP INDEX `makett_id`;

ALTER TABLE `epitesi_tippek_naplo`
  ADD INDEX `idx_epitesi_tippek_naplo_makett_id` (`makett_id`);

-- (Ajánlott) a blokk táblában is legyen index naplo_id-ra (ha nincs)
-- ALTER TABLE `epitesi_tippek_blokk` ADD INDEX `idx_tippek_blokk_naplo_id` (`naplo_id`);
