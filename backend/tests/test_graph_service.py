from app.services.neo4j_graph import GraphQueryBlocked, build_graph_intent


def test_build_graph_intent_blocks_write_words() -> None:
    try:
        build_graph_intent("delete project atlas", [], [])
    except GraphQueryBlocked:
        pass
    else:  # pragma: no cover - explicit failure branch
        raise AssertionError("Expected write-like command to be blocked.")


def test_build_graph_intent_detects_neighbor_focus() -> None:
    intent = build_graph_intent(
        "show connected nodes",
        visible_node_ids=["project-1", "concept-1"],
        selected_node_ids=["project-1"],
    )

    assert intent.mode == "neighbors"
    assert "selected_ids" in intent.params


def test_build_graph_intent_detects_type_filter() -> None:
    intent = build_graph_intent("show documents", [], [])

    assert intent.mode == "type"
    assert intent.params["node_type"] == "document"


def test_build_graph_intent_falls_back_to_search() -> None:
    intent = build_graph_intent("atlas readiness", [], [])

    assert intent.mode == "search"
    assert intent.params["search"] == "atlas readiness"
