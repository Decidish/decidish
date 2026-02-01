package decidish.com.core.unit;

import decidish.com.core.controller.JobController;
import decidish.com.core.scheduler.Scheduler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Tag("unit")
@WebMvcTest(JobController.class)
class JobControllerUT {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private Scheduler scheduler;

    @Test
    @DisplayName("POST /api/v1/jobs/cleanup returns 200 and triggers cleanup")
    void triggerCleanup() throws Exception {
        mockMvc.perform(post("/api/v1/jobs/cleanup")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("started"));

        verify(scheduler, timeout(1000)).cleanupDeprecatedDataOnly();
    }
}
