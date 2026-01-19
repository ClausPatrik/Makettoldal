-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Jan 19. 21:58
-- Kiszolgáló verziója: 10.4.32-MariaDB
-- PHP verzió: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `makett`
--

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `uzenetek`
--

CREATE TABLE `uzenetek` (
  `id` int(11) NOT NULL,
  `kuldo_felhasznalo_id` int(11) NOT NULL,
  `targy` varchar(120) NOT NULL,
  `uzenet` text NOT NULL,
  `letrehozva` timestamp NOT NULL DEFAULT current_timestamp(),
  `olvasva` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `uzenetek`
--

INSERT INTO `uzenetek` (`id`, `kuldo_felhasznalo_id`, `targy`, `uzenet`, `letrehozva`, `olvasva`) VALUES
(1, 1, 'Proba', 'Sziasztok!\n123123', '2026-01-19 20:24:39', 0),
(2, 1, 'Próba', 'Sziasztok!\n123123', '2026-01-19 20:30:30', 0),
(3, 1, 'dqwa', 'fdAWFfaísdf', '2026-01-19 20:33:28', 0),
(4, 1, 'dfasd', 'dasdsada', '2026-01-19 20:34:48', 0),
(5, 1, 'dasdsa', 'dsadsadad', '2026-01-19 20:37:11', 0),
(6, 1, 'fdasdsad', 'dsadsada', '2026-01-19 20:44:01', 0),
(7, 1, 'dasdasas', 'dasdada', '2026-01-19 20:46:05', 0),
(8, 1, 'dsda', 'dasdsad', '2026-01-19 20:52:20', 0),
(9, 1, 'dsada', 'dsadada', '2026-01-19 20:53:46', 0),
(10, 1, 'sdaasdad', 'dasdsadadadadadadada', '2026-01-19 20:54:34', 0),
(11, 1, 'dhr5etzh', 'tiuliutzlgul', '2026-01-19 20:55:04', 0),
(12, 1, 'fsdfsfsf', 'fsdfsfsfs', '2026-01-19 20:57:42', 0);

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `uzenetek`
--
ALTER TABLE `uzenetek`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kuldo_felhasznalo_id` (`kuldo_felhasznalo_id`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `uzenetek`
--
ALTER TABLE `uzenetek`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `uzenetek`
--
ALTER TABLE `uzenetek`
  ADD CONSTRAINT `uzenetek_ibfk_1` FOREIGN KEY (`kuldo_felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
