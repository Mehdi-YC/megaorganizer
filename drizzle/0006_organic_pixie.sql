-- Collapse duplicate edges before the unique index can be created. Older
-- builds allowed the same child to be added to a parent more than once.
DELETE FROM `tree_relationship`
WHERE `rowid` NOT IN (
	SELECT MIN(`rowid`) FROM `tree_relationship`
	GROUP BY `parent_type`, `parent_id`, `child_type`, `child_id`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `treeRelationship_parent_child_unique` ON `tree_relationship` (`parent_type`,`parent_id`,`child_type`,`child_id`);
