import { useEffect, useState } from "react";

import { ResourceList } from "../../components";
import { useResourceService } from "../../services";

export function Home() {
	const resourceService = useResourceService();
	const [resources, setResources] = useState([]);

	useEffect(() => {
		resourceService.getPublished().then(setResources);
	}, [resourceService]);

	return <ResourceList resources={resources} />;
}

export default Home;
