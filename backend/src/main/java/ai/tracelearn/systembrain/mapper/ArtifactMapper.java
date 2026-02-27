package ai.tracelearn.systembrain.mapper;

import ai.tracelearn.systembrain.domain.Artifact;
import ai.tracelearn.systembrain.dto.ArtifactResponse;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * ArtifactMapper — no longer used for the main getArtifacts() path.
 *
 * ArtifactService.buildArtifactEntries() manually constructs ArtifactEntry objects
 * because the mapping is non-trivial: one Artifact row explodes into up to three
 * ArtifactEntry objects, each with a different type/title/description, and URLs
 * are presigned before being set.
 *
 * This interface is kept to avoid breaking any other callers that may depend on it.
 * It can be removed if no other code references it.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ArtifactMapper {
    // Intentionally empty — ArtifactService builds ArtifactResponse directly.
}