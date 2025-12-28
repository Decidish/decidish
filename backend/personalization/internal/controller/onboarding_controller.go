package controller

import (
	"personalization/internal/service"

	"github.com/gin-gonic/gin"
)

type OnboardingController struct {
	OnboardingService service.IOnboardingService
}

func NewOnboardingController(service service.IOnboardingService) *OnboardingController {
	return &OnboardingController{
		OnboardingService: service,
	}
}

func (controller OnboardingController) AddMappings(r *gin.RouterGroup) {
	r.POST("/onboarding", controller.OnboardingService.CreateUserPreferences)
}
