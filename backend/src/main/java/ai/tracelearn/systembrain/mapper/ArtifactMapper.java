package ai.tracelearn.systembrain.mapper;

import ai.tracelearn.systembrain.domain.Artifact;
import ai.tracelearn.systembrain.dto.ArtifactResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ArtifactMapper {

    @Mapping(source = "session.id", target = "sessionId")
    ArtifactResponse toResponse(Artifact artifact);
}
