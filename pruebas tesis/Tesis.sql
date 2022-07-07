CREATE TABLE `roles` (
  `id` int(11),
  `roleName` varchar(30)
);

CREATE TABLE `users` (
  `id` int(11) PRIMARY KEY,
  `role_id` int(1),
  `username` varchar(30),
  `email` varchar(40),
  `password` varchar(50)
);

CREATE TABLE `socialNetworks` (
  `id` int(20) PRIMARY KEY,
  `users_id` int(11),
  `networkName` varchar(30),
  `networkLink` varchar(255)
);

CREATE TABLE `comics` (
  `id` int(20) PRIMARY KEY,
  `comicUploader_id` int(11),
  `comicName` varchar(255),
  `comicDescription` varchar(255),
  `comicStatus` varchar(15),
  `comicSchedule` varchar(15),
  `comicWriter` varchar(30),
  `comicCoverPath` varchar(255),
  `comicCategories` varchar(255),
  `comicStart` datetime,
  `comicAdded` datetime,
  `comicUpdated` datetime
);

CREATE TABLE `chapters` (
  `id` int(20) PRIMARY KEY,
  `comic_id` int(20),
  `chapterNumber` int(4),
  `chaterTitle` varchar(255)
);

CREATE TABLE `categories` (
  `id` int(11) PRIMARY KEY,
  `comic_id` int(20),
  `categoriesList` varchar(255)
);

CREATE TABLE `comments` (
  `id` int(20) PRIMARY KEY,
  `user_id` int(11),
  `chapter_id` int(20),
  `commentText` varchar(400)
);

ALTER TABLE `users` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

ALTER TABLE `socialNetworks` ADD FOREIGN KEY (`users_id`) REFERENCES `users` (`id`);

ALTER TABLE `comics` ADD FOREIGN KEY (`comicUploader_id`) REFERENCES `users` (`id`);

ALTER TABLE `chapters` ADD FOREIGN KEY (`comic_id`) REFERENCES `comics` (`id`);

ALTER TABLE `comics` ADD FOREIGN KEY (`id`) REFERENCES `categories` (`comic_id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`);

ALTER TABLE `comments` ADD FOREIGN KEY (`id`) REFERENCES `users` (`id`);
