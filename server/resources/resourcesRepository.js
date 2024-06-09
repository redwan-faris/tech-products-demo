import db, { ErrorCodes, insertQuery, singleLine, updateQuery } from "../db";

import { DuplicateResource } from "./resourcesService";

const resourceQuery = singleLine`
	SELECT r.*, t.name as topic_name
	FROM resources as r
	LEFT JOIN topics as t
	ON r.topic = t.id
`;

const pagedResourceQuery = singleLine`
		${resourceQuery}
		WHERE draft = $1
		ORDER BY accession DESC
		LIMIT $2
		OFFSET $3;
	`;

export const add = async ({
	description,
	source,
	title,
	topic,
	url,
	isDraft,
	id,
}) => {
	try {
		const {
			rows: [created],
		} = await db.query(
			insertQuery("resources", [
				"description",
				"source",
				"title",
				"topic",
				"url",
				"draft",
				"owner",
			]),
			[description, source, title, topic, url, isDraft, id]
		);
		return created;
	} catch (err) {
		if (err.code === ErrorCodes.UNIQUE_VIOLATION) {
			throw new DuplicateResource();
		}
		throw err;
	}
};

export const count = async ({ draft, userId }) => {
	let query = "SELECT COUNT(*) FROM resources WHERE draft = $1;";
	let parameters = [draft];
	if (userId) {
		query = "SELECT COUNT(*) FROM resources WHERE draft = $1 AND owner = $2;";
		parameters = [draft, userId];
	}
	const {
		rows: [{ count }],
	} = await db.query(query, parameters);
	return parseInt(count, 10);
};

export const findAll = async ({ draft, limit, offset }) => {
	const { rows } = await db.query(pagedResourceQuery, [draft, limit, offset]);
	return rows;
};

export const findOne = async (id) => {
	const {
		rows: [resource],
	} = await db.query(`${resourceQuery} WHERE r.id = $1;`, [id]);
	return resource;
};

export const update = async (id, { draft, publication, publisher }) => {
	const {
		rows: [updated],
	} = await db.query(
		updateQuery("resources", ["draft", "publication", "publisher"]),
		[id, draft, publication, publisher]
	);
	return updated;
};

export const getResourcesForUser = async ({ id, limit, offset }) => {
	const { rows } = await db.query(
		`SELECT r.*, t.name as topic_name
			FROM resources as r
			LEFT JOIN topics as t
			ON r.topic = t.id
			WHERE r.owner = $1
			ORDER BY publication DESC
			LIMIT $2
			OFFSET $3;`,
		[id, limit, offset]
	);
	return rows;
};

export const remove = async (id) => {
	await db.query("DELETE FROM resources WHERE id = $1", [id]);
};
