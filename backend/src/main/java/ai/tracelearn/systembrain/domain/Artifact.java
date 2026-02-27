package ai.tracelearn.systembrain.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "artifacts", indexes = {
        @Index(name = "idx_artifacts_session_id", columnList = "session_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Artifact extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private Session session;

    @Column(name = "pdf_url", length = 1024)
    private String pdfUrl;

    @Column(name = "ppt_url", length = 1024)
    private String pptUrl;

    @Column(name = "summary_url", length = 1024)
    private String summaryUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_status", length = 30, nullable = false)
    @Builder.Default
    private ArtifactStatus generationStatus = ArtifactStatus.PENDING;
}