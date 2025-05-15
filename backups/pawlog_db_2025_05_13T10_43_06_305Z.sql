-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: pawlog_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `feeding_logs`
--

DROP TABLE IF EXISTS `feeding_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feeding_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pet_id` int NOT NULL,
  `feeding_time` datetime NOT NULL,
  `food_type` varchar(255) DEFAULT NULL,
  `amount` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feeding_logs_pet_id` (`pet_id`),
  KEY `idx_feeding_logs_feeding_time` (`feeding_time`),
  CONSTRAINT `feeding_logs_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feeding_logs`
--

LOCK TABLES `feeding_logs` WRITE;
/*!40000 ALTER TABLE `feeding_logs` DISABLE KEYS */;
INSERT INTO `feeding_logs` VALUES (1,1,'2025-05-13 15:10:00','Dry Food','1 cup',NULL,'2025-05-13 07:10:58','2025-05-13 07:10:58'),(2,7,'2025-05-13 16:05:00','Wet Food','1 pack','Whiskerins','2025-05-13 08:06:04','2025-05-13 08:06:04');
/*!40000 ALTER TABLE `feeding_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pets`
--

DROP TABLE IF EXISTS `pets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `sex` enum('Male','Female') NOT NULL,
  `about` text,
  `image_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `birthdate` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pets`
--

LOCK TABLES `pets` WRITE;
/*!40000 ALTER TABLE `pets` DISABLE KEYS */;
INSERT INTO `pets` VALUES (1,4,'Mala','Dog','German Shepherd','Female','my babyy','/uploads/pets/1746508166159-german shepherd.png','2025-05-06 05:09:26','2024-06-04'),(2,4,'Mochi','Dog','Belgian Malanois','Female','my second babyyy','/uploads/pets/1746509394001-belgian.jpg','2025-05-06 05:29:54','2024-01-17'),(3,4,'Ozi','Cat','Maine Coon','Male','My oh so sweet ozi baby','/uploads/pets/1746528314148-maine coon.jpg','2025-05-06 05:54:02','2024-02-13'),(4,4,'Shiro','Dog','Husky','Male','Shiroshima','/uploads/pets/1746510885361-husky.jpg','2025-05-06 05:54:45','2025-04-07'),(7,9,'Bougie','Dog','Aspin','Male','very energetic baby','/uploads/pets/1747124251884-bougie.jpg','2025-05-13 08:02:10','2025-01-12');
/*!40000 ALTER TABLE `pets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact` varchar(20) DEFAULT NULL,
  `bio` text,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_picture` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`),
  UNIQUE KEY `unique_contact` (`contact`),
  UNIQUE KEY `unique_username` (`username`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'asd','asd','0012-12-12','johndoe@example.com','123-456-7890','','','2025-05-02 09:01:22',NULL),(3,'asjhdjak',NULL,NULL,'kjahsdja@gmail.com',NULL,NULL,'$2b$10$TYq74xFhgBIuTiAarpcZyOlHvX2S1idNbizhm3m3oyhxfDzM5rdcW','2025-05-02 09:35:46',NULL),(4,'sashimi','Samantha','2025-04-22','sashimi@gmail.com','0912034123','I\'m good','$2b$10$IqMkh2OTFYGx8N2wEHNT/epa30WBTQhOalyWOyVuOX1bdb3H3wkTq','2025-05-02 09:39:28','/uploads/1746512532597-Asul Bilog Icon Logo ng Retail.jpg'),(6,'sashimi5',NULL,NULL,'sashimi5@gmail.com',NULL,NULL,'$2b$10$QrSTP8fmgQfWjv3ryi8yoOud.n3yVYPqx/CiJkLu9ClUg9tjUjp.6','2025-05-02 10:02:20',NULL),(7,'sam',NULL,NULL,'sam@gmail.com',NULL,NULL,'$2b$10$0WvurTsknBD8LuF1MQbPCOG9bdPrt.iORthbTEXAfk8npY8flU7le','2025-05-02 14:55:30',NULL),(9,'emman','Emmanuel','2004-06-02','emman@gmail.com','09561482700','I\'m bad','$2b$10$IJ65FWpGyoKpYePDNIqcJegwMfsnWdflibqMInElyszPpU6xyKF32','2025-05-13 07:57:50',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vaccination_records`
--

DROP TABLE IF EXISTS `vaccination_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaccination_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pet_id` int NOT NULL,
  `vaccine_name` varchar(255) NOT NULL,
  `date_administered` date NOT NULL,
  `next_due_date` date DEFAULT NULL,
  `vet_clinic` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `vet_in_charge` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pet_id` (`pet_id`),
  CONSTRAINT `vaccination_records_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vaccination_records`
--

LOCK TABLES `vaccination_records` WRITE;
/*!40000 ALTER TABLE `vaccination_records` DISABLE KEYS */;
INSERT INTO `vaccination_records` VALUES (3,2,'Rabies','2025-05-03','2025-06-07','Pet Home','2025-05-09 15:53:16','Samantha'),(4,1,'Rabies','2025-05-12','2025-06-12','Pet Home','2025-05-13 06:38:57',NULL),(5,7,'Rabies','2025-05-01','2025-06-01','Batoy\'s','2025-05-13 08:05:18','Bryan');
/*!40000 ALTER TABLE `vaccination_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vet_visits`
--

DROP TABLE IF EXISTS `vet_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vet_visits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pet_id` int NOT NULL,
  `visit_date` date NOT NULL,
  `clinic_name` varchar(255) DEFAULT NULL,
  `vet_name` varchar(255) DEFAULT NULL,
  `reason` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vet_visits_pet_id` (`pet_id`),
  KEY `idx_vet_visits_visit_date` (`visit_date`),
  CONSTRAINT `vet_visits_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vet_visits`
--

LOCK TABLES `vet_visits` WRITE;
/*!40000 ALTER TABLE `vet_visits` DISABLE KEYS */;
INSERT INTO `vet_visits` VALUES (1,1,'2025-05-13','Pet Home','Samantha','tummy ache','don\'t make them eat orange\n','2025-05-13 07:26:19','2025-05-13 07:26:19'),(2,7,'2025-05-13','Batoy\'s','Bryan','limping','was just acting','2025-05-13 08:06:39','2025-05-13 08:06:39');
/*!40000 ALTER TABLE `vet_visits` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-13 18:43:06
