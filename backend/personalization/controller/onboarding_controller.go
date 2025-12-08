package controller

import (
	"personalization/service"

	"github.com/gin-gonic/gin"
)

type OnboardingController struct {
	service.OnboardingService
}

func NewOnboardingController(service service.OnboardingService) *OnboardingController {
	return &OnboardingController{
		OnboardingService: service,
	}
}

func (controller OnboardingController) AddMappings(r *gin.RouterGroup) {
	r.POST("/onboarding", controller.OnboardingService.CreateUserPreferences)
}
