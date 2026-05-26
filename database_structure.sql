-- ============================================
-- Cafe IronColol - Database Structure
-- Database: cafe_ironcolol
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS `cafe_ironcolol`;
USE `cafe_ironcolol`;

-- ============================================
-- Table: products
-- ============================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT 'snack',
  `price` int NOT NULL,
  `description` text,
  `image` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: orders
-- ============================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `items` json DEFAULT NULL,
  `total` int DEFAULT '0',
  `status` varchar(50) DEFAULT 'pending',
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_address` text,
  `table_number` varchar(50) DEFAULT NULL,
  `note` text,
  `payment_method` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: cafe_tables
-- ============================================
DROP TABLE IF EXISTS `cafe_tables`;
CREATE TABLE `cafe_tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `number` int NOT NULL,
  `status` varchar(50) DEFAULT 'available',
  `is_active` tinyint(1) DEFAULT '1',
  `qr_code` text,
  `qr_code_url` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `number` (`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Insert initial data (products)
-- ============================================
INSERT INTO `products` (`name`, `category`, `price`, `description`, `image`) VALUES
('Espresso', 'kopi', 25000, 'Kopi hitam pekat dengan crema', 'https://via.placeholder.com/300x200?text=Espresso'),
('Cappuccino', 'kopi', 32000, 'Espresso dengan busa susu', 'https://via.placeholder.com/300x200?text=Cappuccino'),
('French Fries', 'snack', 18000, 'Kentang goreng renyah', 'https://via.placeholder.com/300x200?text=French+Fries'),
('Nasi Goreng', 'makanan', 35000, 'Nasi goreng spesial', 'https://via.placeholder.com/300x200?text=Nasi+Goreng');

-- ============================================
-- Insert initial data (tables 1-10)
-- ============================================
INSERT INTO `cafe_tables` (`number`, `status`) VALUES
(1, 'available'),
(2, 'available'),
(3, 'available'),
(4, 'available'),
(5, 'available'),
(6, 'available'),
(7, 'available'),
(8, 'available'),
(9, 'available'),
(10, 'available');